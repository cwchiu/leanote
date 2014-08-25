package service

import (
    "github.com/revel/revel"
	"github.com/leanote/leanote/app/info"
	"github.com/leanote/leanote/app/db"
    "labix.org/v2/mgo"
	//. "github.com/leanote/leanote/app/lea"
	"labix.org/v2/mgo/bson"
	"time"
    "errors"
)


func SearchNote(query interface{}, skipNum int, sortFieldR string, pageSize int) (count int, notes []info.Note, err error){    
    notes = []info.Note{}
    err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
        q := Notes.Find(query) 
        count, err = q.Count()
        if err != nil {
            return err
        }
        if count > 0 {
            if sortFieldR != "*" {
                q.Sort(sortFieldR)
            }
            
            if skipNum != -1 {
                q.Skip(skipNum)
            }
            
            if pageSize != -1 {
                q.Limit(pageSize)
            }
            
            q.All(&notes)
        }

        return nil
    }) 
    
    return
}

type NoteService struct {
}

// 通过id, userId得到note
func (this *NoteService) GetNote(noteId, userId string) (note info.Note, err error) {
	note = info.Note{}
    err = db.WithCollection("notes", func(collection *mgo.Collection) error {
        db.GetByIdAndUserId(collection, noteId, userId, &note)
        
        return nil
    })    
	return
}

// 得到blog, blogService用
// 不要传userId, 因为是公开的
func (this *NoteService) GetBlogNote(noteId string) (note info.Note, err error) {
	note = info.Note{}
    err = db.WithCollection("notes", func(collection *mgo.Collection) error {
        db.GetByQ(collection, bson.M{"_id": bson.ObjectIdHex(noteId), "IsBlog": true, "IsTrash": false}, &note)
        
        return nil
    })
	return
}

// 通过id, userId得到noteContent
func (this *NoteService) GetNoteContent(noteContentId, userId string) (noteContent info.NoteContent, err error) {
	noteContent = info.NoteContent{}
    err = db.WithCollection("note_contents", func(collection *mgo.Collection) error {
        db.GetByIdAndUserId(collection, noteContentId, userId, &noteContent)
        
        return nil
    })
    
	return
}

// 得到笔记和内容
func (this *NoteService) GetNoteAndContent(noteId, userId string) (noteAndContent info.NoteAndContent, err error) {
	note, err := this.GetNote(noteId, userId)
    if err != nil {
        return
    }
    
	noteContent, err := this.GetNoteContent(noteId, userId)
    if err != nil {
        return
    }
    
	noteAndContent = info.NoteAndContent{note, noteContent}
    
    return
}

// 列出note, 排序规则, 还有分页
// CreatedTime, UpdatedTime, title 来排序
//
// pageNumber 分頁號
// pageSize 定義分頁筆數
// sortField 定義排序欄位
// isAsc 排序規則
func (this *NoteService) ListNotes(userId, notebookId string,
		isTrash bool, pageNumber, pageSize int, sortField string, isAsc bool, isBlog bool) (count int, notes []info.Note, err error) {

    //revel.INFO.Printf("ListNotes %s, %s, %s\n", userId, notebookId, sortField)
    
	skipNum, sortFieldR := parsePageAndSort(pageNumber, pageSize, sortField, isAsc)

    // 不是trash的
	query := bson.M{"UserId": bson.ObjectIdHex(userId), "IsTrash": isTrash}
	if isBlog {
		query["IsBlog"] = true
	}

	if notebookId != "" {
		query["NotebookId"] = bson.ObjectIdHex(notebookId)
	}

    count, notes, err = SearchNote(query, skipNum, sortFieldR, pageSize)

	return
}

// 通过noteIds来查询
// ShareService调用
func (this *NoteService) ListNotesByNoteIdsWithPageSort(noteIds []bson.ObjectId, userId string,
		pageNumber, pageSize int, sortField string, isAsc bool, isBlog bool) (count int, notes []info.Note, err error) {
	skipNum, sortFieldR := parsePageAndSort(pageNumber, pageSize, sortField, isAsc)

    query := bson.M{"_id": bson.M{"$in": noteIds}, "IsTrash": false}
    _, notes, err = SearchNote(query, skipNum, sortFieldR, pageSize)

	return
}

// shareService调用
func (this *NoteService) ListNotesByNoteIds(noteIds []bson.ObjectId) (count int, notes []info.Note, err error) {
	notes = []info.Note{}
    count, notes, err = SearchNote(bson.M{"_id": bson.M{"$in": noteIds}}, -1, "*", -1)

	return
}

// blog需要
func (this *NoteService) ListNoteContentsByNoteIds(noteIds []bson.ObjectId) (notes []info.NoteContent) {
	notes = []info.NoteContent{}

	db.NoteContents.
		Find(bson.M{"_id": bson.M{"$in": noteIds}}).
		All(&notes)
        
	return
}

// 只得到abstract, 不需要content
func (this *NoteService) ListNoteAbstractsByNoteIds(noteIds []bson.ObjectId) (notes []info.NoteContent, err error) {
	notes = []info.NoteContent{}
    
    err = db.WithCollection("note_contents", func(NoteContents *mgo.Collection) error {
        db.ListByQWithFields(NoteContents, bson.M{"_id": bson.M{"$in": noteIds}}, []string{"_id", "Abstract"}, &notes)
        return nil
    })
    
	return
}

// 添加笔记
// 首先要判断Notebook是否是Blog, 是的话设为blog
// [ok]
func (this *NoteService) AddNote(note info.Note) (info.Note, error) {
	if(note.NoteId.Hex() == "") {
		noteId := bson.NewObjectId();
		note.NoteId = noteId;
	}
	note.CreatedTime = time.Now()
	note.UpdatedTime = note.CreatedTime
	note.IsTrash = false
	note.UpdatedUserId = note.UserId

	// 设为blog
	note.IsBlog = notebookService.IsBlog(note.NotebookId.Hex())

    err := db.WithCollection("notes", func(collection *mgo.Collection) error {    
        db.Insert(collection, note)
        return nil
    })
	// tag1
	tagService.AddTags(note.UserId.Hex(), note.Tags)	
    
    return note, err
}

// 添加共享d笔记
func (this *NoteService) AddSharedNote(note info.Note, myUserId bson.ObjectId) (info.Note, error) {
	// 判断我是否有权限添加
	if shareService.HasUpdateNotebookPerm(note.UserId.Hex(), myUserId.Hex(), note.NotebookId.Hex()) {
		note.CreatedUserId = myUserId // 是我给共享我的人创建的
		return this.AddNote(note)
	}
	return info.Note{}, nil
}

// 添加笔记本内容
// [ok]
func (this *NoteService) AddNoteContent(noteContent info.NoteContent) ( info.NoteContent,  error) {
	noteContent.CreatedTime = time.Now()
	noteContent.UpdatedTime = noteContent.CreatedTime
	noteContent.UpdatedUserId = noteContent.UserId
    err := db.WithCollection("note_contents", func(NoteContents *mgo.Collection) error {
        db.Insert(NoteContents, noteContent)
        return nil
    })
    
	return noteContent, err
}

// 添加笔记和内容
// 这里使用 info.NoteAndContent 接收?
func (this *NoteService) AddNoteAndContent(note info.Note, noteContent info.NoteContent, myUserId bson.ObjectId) (info.Note, error) {
	if(note.NoteId.Hex() == "") {
		noteId := bson.NewObjectId()
		note.NoteId = noteId
	}
	noteContent.NoteId = note.NoteId
    var err error
	if note.UserId != myUserId	{
		note, err = this.AddSharedNote(note, myUserId)
	} else {
		note, err = this.AddNote(note)
	}
	if note.NoteId != "" {
		this.AddNoteContent(noteContent)
	}
	return note, err
}

// 修改笔记
// [ok] TODO perm还没测
func (this *NoteService) UpdateNote(userId, updatedUserId, noteId string, needUpdate bson.M) error {
	// updatedUserId 要修改userId的note, 此时需要判断是否有修改权限
	if userId != updatedUserId && !shareService.HasUpdatePerm(userId, updatedUserId, noteId) {		
        return errors.New("NO AUTH")		
	}

	needUpdate["UpdatedUserId"] = bson.ObjectIdHex(updatedUserId)
	needUpdate["UpdatedTime"] = time.Now()

	// 添加tag2
	if tags, ok := needUpdate["Tags"]; ok {
		tagService.AddTagsI(userId, tags)
	}

    var err error
	// 是否修改了isBlog
	// 也要修改noteContents的IsBlog
	if isBlog, ok := needUpdate["IsBlog"]; ok {
        err = db.WithCollection("note_contents", func(NoteContents *mgo.Collection) error {    
            db.UpdateByIdAndUserIdMap(NoteContents, noteId, userId, bson.M{"IsBlog": isBlog})
            
            return nil
        })
        
        if err != nil{
            return err
        }
	}
    
    err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
        db.UpdateByIdAndUserIdMap(Notes, noteId, userId, needUpdate)
        return nil
    })
    
    return err
}

// 这里要判断权限, 如果userId != updatedUserId, 那么需要判断权限
// [ok] TODO perm还没测 [del]
func (this *NoteService) UpdateNoteTitle(userId, updatedUserId, noteId, title string) error {
	// updatedUserId 要修改userId的note, 此时需要判断是否有修改权限
	if userId != updatedUserId && !shareService.HasUpdatePerm(userId, updatedUserId, noteId){		
        return errors.New("NO AUTH")        
	}
    
    err := db.WithCollection("notes", func(Notes *mgo.Collection) error {
        ret := db.UpdateByIdAndUserIdMap(Notes, noteId, userId,
            bson.M{"UpdatedUserId": bson.ObjectIdHex(updatedUserId), "Title": title, "UpdatedTime": time.Now()})
        
        if !ret {
            return errors.New("update fail")
        }
        return nil
    })
    
    return err
}

// 修改笔记本内容
// [ok] TODO perm未测
func (this *NoteService) UpdateNoteContent(userId, updatedUserId, noteId, content, abstract string) error {
	// updatedUserId 要修改userId的note, 此时需要判断是否有修改权限
	if userId != updatedUserId && !shareService.HasUpdatePerm(userId, updatedUserId, noteId){
		return errors.New("NO AUTH")
	}
    
    err := db.WithCollection("note_contents", func(NoteContents *mgo.Collection) error {
        if !db.UpdateByIdAndUserIdMap(NoteContents, noteId, userId,
            bson.M{"UpdatedUserId": bson.ObjectIdHex(updatedUserId),
            "Content": content,
            "Abstract": abstract,
            "UpdatedTime": time.Now()}) {

            return errors.New("update fail")
        }
        
        // 这里, 添加历史记录
        noteContentHistoryService.AddHistory(noteId, userId, info.EachHistory{UpdatedUserId: bson.ObjectIdHex(updatedUserId),
            Content: content,
            UpdatedTime: time.Now(),
        })
        
        return nil
    })
    
    return err
}

// 更新tags
// [ok] [del]
func (this *NoteService) UpdateTags(noteId string, userId string, tags []string) error {

    err := db.WithCollection("notes", func(Notes *mgo.Collection) error {
        db.UpdateByIdAndUserIdField(Notes, noteId, userId, "Tags", tags)
        
        return nil
    })
    
    return err
}

// 移动note
// trash, 正常的都可以用
// 1. 要检查下notebookId是否是自己的
// 2. 要判断之前是否是blog, 如果不是, 那么notebook是否是blog?
func (this *NoteService) MoveNote(noteId, notebookId, userId string) (note info.Note, err error) {
	if !notebookService.IsMyNotebook(notebookId, userId) {
        return info.Note{}, nil
    }
    
    err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
    
        re := db.UpdateByIdAndUserId(Notes, noteId, userId,
            bson.M{"$set": bson.M{"IsTrash": false,
                "NotebookId": bson.ObjectIdHex(notebookId)}})

        if re {
            // 更新blog状态
            this.updateToNotebookBlog(noteId, notebookId, userId)
        }

        note, err = this.GetNote(noteId, userId)
        
        return err
    })
    
    return
}

// 如果自己的blog状态是true, 不用改变,
// 否则, 如果notebookId的blog是true, 则改为true之
// 返回blog状态
func (this *NoteService) updateToNotebookBlog(noteId, notebookId, userId string) (success bool, err error) {
    success = false
    var is_blog bool
    is_blog, err = this.IsBlog(noteId)
	if err != nil && is_blog {
        success = true
        return
	}
    
	if notebookService.IsBlog(notebookId) {
        err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
            db.UpdateByIdAndUserId(Notes, noteId, userId,
                bson.M{"$set": bson.M{"IsBlog": true}})
                
            success = true
            
            return nil
		})
	}
    
	return 
}

// 判断是否是blog
func (this *NoteService) IsBlog(noteId string) (success bool, err error) {
	note := info.Note{}
    err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
        db.GetByQWithFields(Notes, bson.M{"_id": bson.ObjectIdHex(noteId)}, []string{"IsBlog"}, &note);
        success = note.IsBlog
        
        return nil
    })
    
    return 
}

// 复制note
// 正常的可以用
// 先查, 再新建
// 要检查下notebookId是否是自己的
func (this *NoteService) CopyNote(noteId, notebookId, userId string)(note info.Note, err error ){
	if !notebookService.IsMyNotebook(notebookId, userId) {
        note = info.Note{}
        err = errors.New("not my notebook")
    }
    
    note, err = this.GetNote(noteId, userId)
    if err != nil {
        return
    }
    
    noteContent, err := this.GetNoteContent(noteId, userId)
    if err != nil {
        return
    }

    // 重新生成noteId
    note.NoteId = bson.NewObjectId();
    note.NotebookId = bson.ObjectIdHex(notebookId)

    noteContent.NoteId = note.NoteId
    this.AddNoteAndContent(note, noteContent, note.UserId);

    // 更新blog状态
    is_blog, err := this.updateToNotebookBlog(note.NoteId.Hex(), notebookId, userId)
    if err != nil {
        return
    }
    
    note.IsBlog = is_blog

    return    
}

// 复制别人的共享笔记给我
// TODO 判断是否共享了给我
func (this *NoteService) CopySharedNote(noteId, notebookId, fromUserId, myUserId string) (note info.Note, err error) {
	if !notebookService.IsMyNotebook(notebookId, myUserId) {
        note = info.Note{}
        err = errors.New("not my notebook")
    }
    
    note, err = this.GetNote(noteId, fromUserId)
    if err != nil {
        return
    }
    
    if note.NoteId == "" {
        err = errors.New("invalid note id")
    }
    
    noteContent, err := this.GetNoteContent(noteId, fromUserId)
    if err != nil {
        return
    }

    // 重新生成noteId
    note.NoteId = bson.NewObjectId();
    note.NotebookId = bson.ObjectIdHex(notebookId)
    note.UserId = bson.ObjectIdHex(myUserId)
    note.IsTop = false
    note.IsBlog = false // 别人的可能是blog

    // content
    noteContent.NoteId = note.NoteId
    noteContent.UserId = note.UserId

    // 添加之    
    note, err = this.AddNoteAndContent(note, noteContent, note.UserId);
    if err != nil {
        return
    }

    // 更新blog状态
    is_blog, err := this.updateToNotebookBlog(note.NoteId.Hex(), notebookId, myUserId)
    if err != nil {
        return
    }
    
    note.IsBlog = is_blog
    return 
}

// 通过noteId得到notebookId
// shareService call
// [ok]
func (this *NoteService) GetNotebookId(noteId string) (notebook_id bson.ObjectId, err error) {
	note := &info.Note{}
    
    err = db.WithCollection("notes", func(Notes *mgo.Collection) error {
        db.Get(Notes, noteId, note)
        return nil
    })       
    
    if err != nil {
        return
    }
    
	notebook_id = note.NotebookId
    
    return
}

// 搜索Note
func (this *NoteService) SearchNote(key, userId string, pageNumber, pageSize int, sortField string, isAsc, isBlog bool) (count int, notes []info.Note, err error) {
    revel.INFO.Print("SearchNote")
	notes = []info.Note{}
	skipNum, sortFieldR := parsePageAndSort(pageNumber, pageSize, sortField, isAsc)

	// 不是trash的
	query := bson.M{
        "UserId": bson.ObjectIdHex(userId),
		"IsTrash": false,
		"Title": bson.M{"$regex": bson.RegEx{".*?" + key + ".*", "i"}},
	}

	if isBlog {
		query["IsBlog"] = true
	}

    count, notes, err = SearchNote(query, skipNum, sortFieldR, pageSize)
    if err != nil {
        revel.INFO.Print(err)
        return
    }

    // 如果 < pageSize 那么搜索content, 且id不在这些id之间的
    if len(notes) < pageSize {
        //notes = this.searchNoteFromContent(notes, userId, key, pageSize, sortFieldR, isBlog)
    }

	return
}

// 搜索noteContents, 补集pageSize个
func (this *NoteService) searchNoteFromContent(notes []info.Note, userId, key string, pageSize int, sortField string, isBlog bool) []info.Note {
    revel.INFO.Print("searchNoteFromContent")

	var remain = pageSize - len(notes)
	noteIds := make([]bson.ObjectId, len(notes))

	for i, note := range notes {
		noteIds[i] = note.NoteId
	}

    revel.INFO.Printf("now= %d, remain %d, page=%d", len(notes), remain, pageSize )
	noteContents := []info.NoteContent{}
	query := bson.M{"_id": bson.M{"$nin": noteIds}, "UserId": bson.ObjectIdHex(userId), "Content": bson.M{"$regex": bson.RegEx{".*?" + key + ".*", "i"}}}
	if isBlog {
		query["IsBlog"] = true
	}
    err := db.WithCollection("note_contents", func(NoteContents *mgo.Collection) error {
        q := NoteContents.Find(query)
        count, err := q.Count()
        if err != nil {
            return err
        }

        if count > 0 {
            q.Sort(sortField).
                Limit(remain).
                Select(bson.M{"_id": true}).
                All(&noteContents)
        }

        return nil
    })
    if err != nil {
        revel.INFO.Print("Database Error")
        revel.INFO.Print(err)
        return notes
    }

	var lenContent = len(noteContents)
	if(lenContent == 0) {
		return notes
	}

	// 收集ids
	noteIds2 := make([]bson.ObjectId, lenContent)
	for i, content := range noteContents {
		noteIds2[i] = content.NoteId
	}

	// 得到notes
	_, notes2, _ := this.ListNotesByNoteIds(noteIds2)

	// 合并之
	notes = append(notes, notes2...)
	return notes
}

// tag搜索
func (this *NoteService) SearchNoteByTags(tags []string, userId string, pageNumber, pageSize int, sortField string, isAsc bool) (count int, notes []info.Note, err error) {
    revel.INFO.Print("SearchNoteByTags")

	//notes = []info.Note{}
	skipNum, sortFieldR := parsePageAndSort(pageNumber, pageSize, sortField, isAsc)

	// 不是trash的
	query := bson.M{"UserId": bson.ObjectIdHex(userId),
		"IsTrash": false,
		"Tags": bson.M{"$all": tags}}

    count, notes, err = SearchNote(query, skipNum, sortFieldR, pageSize)

	return
}