package service

import (
	"github.com/leanote/leanote/app/info"
	"github.com/leanote/leanote/app/db"
//	. "github.com/leanote/leanote/app/lea"
	"labix.org/v2/mgo/bson"
//	"time"
//	"sort"
)

// blog
/*
note, notebook都可设为blog
关键是, 怎么得到blog列表? 还要分页

??? 不用新建, 直接使用notes表, 添加IsBlog字段. 新建表 blogs {NoteId, UserId, CreatedTime, IsTop(置顶)}, NoteId, UserId 为unique!!

// 设置一个note为blog
添加到blogs中

// 设置/取消notebook为blog
创建一个note时, 如果其notebookId已设为blog, 那么添加该note到blog中.
设置一个notebook为blog时, 将其下所有的note添加到blogs里 -> 更新其IsBlog为true
取消一个notebook不为blog时, 删除其下的所有note -> 更新其IsBlog为false

*/
type BlogService struct {
}

// 得到某博客具体信息
func (this *BlogService) GetBlog(noteId string) (blog info.BlogItem) {
	note, _ := noteService.GetBlogNote(noteId)
	
	if note.NoteId == "" || !note.IsBlog {
		return
	}
	
	// 内容
	noteContent, _ := noteService.GetNoteContent(note.NoteId.Hex(), note.UserId.Hex())
	
	// 组装成blogItem
	blog = info.BlogItem{note, noteContent.Content, false}	
	
	return
}

// 得到用户共享的notebooks
func (this *BlogService) ListBlogNotebooks(userId string) []info.Notebook {
	notebooks := []info.Notebook{}
	db.ListByQ(db.Notebooks, bson.M{"UserId": bson.ObjectIdHex(userId), "IsBlog": true}, &notebooks)
	return notebooks
}

// 博客列表
// userId 表示谁的blog
func (this *BlogService) ListBlogs(userId, notebookId string, page, pageSize int, sortField string, isAsc bool) (int, []info.BlogItem) {
	count, notes, _ := noteService.ListNotes(userId, notebookId, false, page, pageSize, sortField, isAsc, true);
	
	if(notes == nil || len(notes) == 0) {
		return 0, nil
	}
	
	// 得到content, 并且每个都要substring
	noteIds := make([]bson.ObjectId, len(notes))
	for i, note := range notes {
		noteIds[i] = note.NoteId
	}
	
	// 直接得到noteContents表的abstract
	// 这里可能是乱序的
	noteContents, _ := noteService.ListNoteAbstractsByNoteIds(noteIds) // 返回[info.NoteContent]
	noteContentsMap := make(map[bson.ObjectId]info.NoteContent, len(noteContents))
	for _, noteContent := range noteContents {
		noteContentsMap[noteContent.NoteId] = noteContent
	}
	
	// 组装成blogItem
	// 按照notes的顺序
	blogs := make([]info.BlogItem, len(noteIds))
	for i, note := range notes {
		hasMore := true
		var content string
		if noteContent, ok := noteContentsMap[note.NoteId]; ok {
			content = noteContent.Abstract
		}
		blogs[i] = info.BlogItem{note, content, hasMore}
	}
	return count, blogs
}

func (this *BlogService) SearchBlog(key, userId string, page, pageSize int, sortField string, isAsc bool) (int, []info.BlogItem) {
	count, notes, _ := noteService.SearchNote(key, userId, page, pageSize, sortField, isAsc, true);
	
	if(notes == nil || len(notes) == 0) {
		return 0, nil
	}
	
	// 得到content, 并且每个都要substring
	noteIds := make([]bson.ObjectId, len(notes))
	for i, note := range notes {
		noteIds[i] = note.NoteId
	}
	
	// 直接得到noteContents表的abstract
	// 这里可能是乱序的
	noteContents, _ := noteService.ListNoteAbstractsByNoteIds(noteIds) // 返回[info.NoteContent]
	noteContentsMap := make(map[bson.ObjectId]info.NoteContent, len(noteContents))
	for _, noteContent := range noteContents {
		noteContentsMap[noteContent.NoteId] = noteContent
	}
	
	// 组装成blogItem
	// 按照notes的顺序
	blogs := make([]info.BlogItem, len(noteIds))
	for i, note := range notes {
		hasMore := true
		var content string
		if noteContent, ok := noteContentsMap[note.NoteId]; ok {
			content = noteContent.Abstract
		}
		blogs[i] = info.BlogItem{note, content, hasMore}
	}
	return count, blogs
}


//------------------------
// 博客设置
func (this *BlogService) GetUserBlog(userId string) info.UserBlog {
	userBlog := info.UserBlog{}
	db.Get(db.UserBlogs, userId, &userBlog)
	
	if userBlog.Title == "" {
		userInfo := userService.GetUserInfo(userId)
		userBlog.Title = userInfo.Username + " 的博客"
	}

	return userBlog
}

// 修改之
func (this *BlogService) UpdateUserBlog(userBlog info.UserBlog) bool {
	return db.Upsert(db.UserBlogs, bson.M{"_id": userBlog.UserId}, userBlog)
}
// 修改之UserBlogBase
func (this *BlogService) UpdateUserBlogBase(userId string, userBlog info.UserBlogBase) bool {
	return db.UpdateByQMap(db.UserBlogs, bson.M{"_id": bson.ObjectIdHex(userId)}, userBlog)
}
func (this *BlogService) UpdateUserBlogComment(userId string, userBlog info.UserBlogComment) bool {
	return db.UpdateByQMap(db.UserBlogs, bson.M{"_id": bson.ObjectIdHex(userId)}, userBlog)
}
func (this *BlogService) UpdateUserBlogStyle(userId string, userBlog info.UserBlogStyle) bool {
	return db.UpdateByQMap(db.UserBlogs, bson.M{"_id": bson.ObjectIdHex(userId)}, userBlog)
}