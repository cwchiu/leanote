// 1. notebook change
// notebook一改变, 当前的肯定要保存, ajax是异步的. 此时先清空所有note信息. -> 得到该notebook的notes, 显示出来, 并选中第一个!
// 在这期间定时器还会保存, curNoteId还没换, 所以会清空curNoteId的content!!!

// 2. note change, save cur, 立即curNoteId = ""!!

// 3. 什么时候设置curNoteId? 是ajax得到内容之后设置

// note
Note.curNoteId = "";

Note.interval = ""; // 定时器

Note.itemIsBlog = '<div class="item-blog"><i class="fa fa-bold" title="blog"></i></div>';
Note.itemIsBlog = ''; // 不需要
// for render
Note.itemTplNoImg = '<div href="#" class="item ?" noteId="?">'
Note.itemTplNoImg += Note.itemIsBlog +'<div class="item-desc" style="right: 0;"><p class="item-title">?</p><p class="item-text"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-calendar"></i> <span class="updated-time">?</span> <br /><span class="desc">?</span></p></div></div>';

Note.itemTpl = '<div href="#" class="item ?" noteId="?"><div class="item-thumb" style=""><img src="?"/></div>'
Note.itemTpl +=Note.itemIsBlog + '<div class="item-desc" style=""><p class="item-title">?</p><p class="item-text"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-calendar"></i> <span class="updated-time">?</span> <br /><span class="desc">?</span></p></div></div>';

// for new
Note.newItemTpl = '<div href="#" class="item item-active ?" fromUserId="?" noteId="?">'
Note.newItemTpl += Note.itemIsBlog + '<div class="item-desc" style="right: 0px;"><p class="item-title">?</p><p class="item-text"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-calendar"></i> <span class="updated-time">?</span><br /><span class="desc">?</span></p></div></div>';

Note.noteItemListO = $("#noteItemList");

// notbeookId => {"updatedTime" => [noteId1, noteId2], "title" => [noteId1, noteId2...]} 排序方式分组
// 一旦某notebook改变了就清空, 重新排序之. (用js排)
Note.cacheByNotebookId = {all: {}};
Note.notebookIds = {}; // notebookId => true

Note.isReadOnly = false;
// 定时保存信息
Note.intervalTime = 600000; // 600s, 10mins
Note.StartInterval = function() {
	Note.interval = setInterval(function() {
		log("自动保存开始...")
		changedNote = Note.CurChangedSaveIt(false);
	}, Note.intervalTime); // 600s, 10mins
}
// 停止, 当切换note时
// 但过5000后自动启动
Note.StopInterval = function() {
	clearInterval(Note.interval);
	
	setTimeout(function() {
		Note.StartInterval();
	}, Note.intervalTime);
}

// note = {NoteId, Desc, UserId,...}
Note.AddNoteCache = function(note) {
	Note.cache[note.NoteId] = note;
	Note.clearCacheByNotebookId(note.NotebookId);
}
// content = {NoteId:, Content:}
// 还可以设置其它的值
Note.SetNoteCache = function(content, clear) {
	if(!Note.cache[content.NoteId]) {
		 Note.cache[content.NoteId] = content;
	} else {
		$.extend(Note.cache[content.NoteId], content);
	}
	
	if(clear == undefined) {
		clear = true;
	}
	if(clear) {
		Note.clearCacheByNotebookId(content.NotebookId);
	}
}

// 每当有notebookId相应的note改变时都要重新清空之
// 并设置该notebookId有值
Note.clearCacheByNotebookId = function(notebookId) {
	if(notebookId) {
		Note.cacheByNotebookId[notebookId] = {};
		Note.cacheByNotebookId["all"] = {};
		Note.notebookIds[notebookId] = true;
	}
}

// notebook是否有notes
Note.NotebookHasNotes = function(notebookId) {
	var notes = Note.GetNotesByNotebookId(notebookId);
	return !isEmpty(notes);
}

// 得到notebook下的notes, 按什么排序 updatedTime?
Note.GetNotesByNotebookId = function(notebookId, sortBy, isAsc) {
	if(!sortBy) {
		sortBy = "UpdatedTime";
	}
	if(isAsc == "undefined") {
		isAsc = false; // 默认是降序
	}
	
	if(!notebookId) {
		notebookId = "all";
	}
	
	if(!Note.cacheByNotebookId[notebookId]) {
		return [];
	}
	
	if(Note.cacheByNotebookId[notebookId][sortBy]) {
		return Note.cacheByNotebookId[notebookId][sortBy];
	} else {
	}
	
	// 从所有的notes中找到notebookId的, 并排序之
	var notes = [];
	var sortBys = [];
	for(var i in Note.cache) {
		if(!i) {
			continue;
		}
		var note = Note.cache[i];
		// 不要trash的not, 共享的也不要
		if(note.IsTrash || note.IsShared) {
			continue;
		}
		if(notebookId == "all" || note.NotebookId == notebookId) {
			notes.push(note);
		}
	}
	// 排序之
	notes.sort(function(a, b) {
		var t1 = a[sortBy];
		var t2 = b[sortBy];
		
		if(isAsc) {
			if(t1 < t2) {
				return -1;
			} else if (t1 > t2) {
				return 1;
			}	
		} else {
			if(t1 < t2) {
				return 1;
			} else if (t1 > t2) {
				return -1;
			}
		}
		return 0;
	});
	
	// 缓存之
	Note.cacheByNotebookId[notebookId][sortBy] = notes;
	return notes;
}

// render 所有notes, 和第一个note的content
Note.RenderNotesAndFirstOneContent = function(ret) {
	// 错误的ret是一个Object
	if(!isArray(ret)) {
		return;
	}
	
	// note 导航
	Note.RenderNotes(ret);
	// 渲染第一个
	if(!isEmpty(ret[0])) {
		Note.ChangeNote(ret[0].NoteId);
	} else {
	}

}

// 当前的note是否改变过了?
// 返回已改变的信息
// force bool true表示content比较是比较HTML, 否则比较text, 默认为true
// 定时保存用false
Note.curHasChanged = function(force) {
	if(force == undefined) {
		force = true;
	}
	var cacheNote = Note.cache[Note.curNoteId] || {};
	// 收集当前信息, 与cache比对
	var title = $("#noteTitle").val();
	var tags = Tag.GetTags(); // TODO
	
	// 如果是markdown返回[content, preview]
	var contents = getEditorContent(cacheNote.IsMarkdown);
	var content, preview;
	var contentText;
	if (isArray(contents)) {
		content = contents[0];
		preview = contents[1];
		contentText = content;
		// preview可能没来得到及解析
		if (content && previewIsEmpty(preview)) {
			preview = Converter.makeHtml(content);
		}
		if(!content) {
			preview = "";
		}
		cacheNote.Preview = preview; // 仅仅缓存在前台
	} else {
		content = contents;
		try {
			contentText = $(content).text();
		} catch(e) {
		}
	}
	
	var hasChanged = {
		hasChanged: false, // 总的是否有改变
		IsNew: cacheNote.IsNew, // 是否是新添加的
		IsMarkdown: cacheNote.IsMarkdown, // 是否是markdown笔记
		FromUserId: cacheNote.FromUserId, // 是否是共享新建的
		NoteId: cacheNote.NoteId,
		NotebookId: cacheNote.NotebookId
	};
	
	if(hasChanged.IsNew) {
		$.extend(hasChanged, cacheNote);
	}
	
	if(cacheNote.Title != title) {
		hasChanged.hasChanged = true; // 本页使用用小写
		hasChanged.Title = title; // 要传到后台的用大写
		if(!hasChanged.Title) {
		}
	}
	
	if(!arrayEqual(cacheNote.Tags, tags)) {
		hasChanged.hasChanged = true;
		hasChanged.Tags = tags;
	}
	
	// 比较text, 因为note Nav会添加dom会导致content改变
	if((force && cacheNote.Content != content) || (!force && $(cacheNote.Content).text() != contentText)) {
		hasChanged.hasChanged = true;
		hasChanged.Content = content;
		
		// 从html中得到...
		var c = preview || content;
		
		hasChanged.Desc = Note.genDesc(c);
		hasChanged.ImgSrc = Note.getImgSrc(c);
		hasChanged.Abstract = Note.genAbstract(c);
		
	} else {
		log("text相同");
		log(cacheNote.Content == content);
	}
	
	hasChanged["UserId"] = cacheNote["UserId"] || "";
	
	return hasChanged;
}

// 由content生成desc
// 换行不要替换
Note.genDesc = function(content) {
	if(!content) {
		return "";
	}
	
	// 将</div>, </p>替换成\n
	var token = "ALEALE";
	content = content.replace(/<\/p>/g, token); 
	content = content.replace(/<\/div>/g, token);
	content = content.replace(/<\/?.+?>/g," ");
	
	pattern = new RegExp(token, "g");
	content = content.replace(pattern, "<br />");
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />"); // 两个<br />之间可能有空白
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />");
	
	// 去掉最开始的<br />或<p />
	content = trimLeft(content, " ");
	content = trimLeft(content, "<br />");
	content = trimLeft(content, "</p>");
	content = trimLeft(content, "</div>");
	
	if(content.length < 300) {
		return content;
	}
	return content.substring(0, 300);
}

// 得到摘要
Note.genAbstract = function(content, len) {
	if(len == undefined) {
		len = 1000;
	}
	if(content.length < len) {
		return content;
	}
	var isCode = false;
	var isHTML = false;
	var n = 0;
	var result = "";
	var maxLen = len;
	for(var i = 0; i < content.length; ++i) {
		var temp = content[i]
		if (temp == '<') {
			isCode = true
		} else if (temp == '&') {
			isHTML = true
		} else if (temp == '>' && isCode) {
			n = n - 1
			isCode = false
		} else if (temp == ';' && isHTML) {
			isHTML = false
		}
		if (!isCode && !isHTML) {
			n = n + 1
		}
		result += temp
		if (n >= maxLen) {
			break
		}
	}
	
	var d = document.createElement("div");
    d.innerHTML = result
    return d.innerHTML;
}

Note.getImgSrc = function(content) {
	if(!content) {
		return "";
	}
	var imgs = $(content).find("img");
	for(var i in imgs) {
		var src = imgs.eq(i).attr("src");
		if(src) {
			return src;
		}
	}
	return "";
}

// 如果当前的改变了, 就保存它
// 以后要定时调用
// force , 默认是true, 表强校验内容
// 定时保存传false
Note.CurChangedSaveIt = function(force) {
	return; // mobile
	
	// 如果当前没有笔记, 不保存
	if(!Note.curNoteId || Note.isReadOnly) {
		return;
	}
	
	var hasChanged = Note.curHasChanged(force);
		
	// 把已改变的渲染到左边 item-list
	Note.RenderChangedNote(hasChanged);
	
	if(hasChanged.hasChanged || hasChanged.IsNew) {
		delete hasChanged.hasChanged;
		
		// 先缓存, 把markdown的preview也缓存起来
		Note.SetNoteCache(hasChanged, false);
		
		// 设置更新时间
		Note.SetNoteCache({"NoteId": hasChanged.NoteId, "UpdatedTime": (new Date()).format("yyyy-MM-ddThh:mm:ss.S")}, false);
		
		// 保存之
		showMsg("正在保存");
		ajaxPost("/note/UpdateNoteOrContent", hasChanged, function(ret) {
			if(hasChanged.IsNew) {
				// 缓存之, 后台得到其它信息
				ret.IsNew = false;
				Note.SetNoteCache(ret, false);
			}
			showMsg("保存成功!", 1000);
		});
		
		return hasChanged;
	}
	return false;
}

// 样式
Note.selectTarget = function(target) {
	$(".item").removeClass("item-active");
	$(target).addClass("item-active");
}

// 改变note
// 可能改变的是share note
// 1. 保存之前的note
// 2. ajax得到现在的note
Note.ChangeNote = function(selectNoteId, isShare, needSaveChanged) {
	// -1 停止定时器
	Note.StopInterval();
	
	// 0
	var target = $(t('[noteId="?"]', selectNoteId))
	Note.selectTarget(target);
	
	// 1 之前的note, 判断是否已改变, 改变了就要保存之
	// 这里, 在搜索的时候总是保存, 搜索的话, 比较快, 肯定没有变化, 就不要执行该操作
	if(needSaveChanged == undefined) {
		needSaveChanged  = true;
	}
	if(needSaveChanged) {
		var changedNote = Note.CurChangedSaveIt();
	}
	
	// 2. 设空, 防止在内容得到之前又发生保存
	Note.curNoteId = "";
	
	// 2 得到现在的
	// ajax之
	var cacheNote = Note.cache[selectNoteId];
	
	// 判断是否是共享notes
	if(!isShare) {
		if(cacheNote.Perm != undefined) {
			isShare = true;
		}
	}
	var hasPerm = !isShare || Share.HasUpdatePerm(selectNoteId); // 不是共享, 或者是共享但有权限
	
	Note.RenderNote(cacheNote);
	
	function setContent(ret) {
		Note.SetNoteCache(ret, false);
		// 把其它信息也带上
		ret = Note.cache[selectNoteId]
		Note.RenderNoteContent(ret);
		hideLoading();
	}
	
	if(cacheNote.Content) {
		setContent(cacheNote);
		return;
	}
	
	var url = "/note/GetNoteContent";
	var param = {noteId: selectNoteId};
	if(isShare) {
		url = "/share/GetShareNoteContent";
		param.sharedUserId = cacheNote.UserId // 谁的笔记
	}
	
	// 这里loading
	showLoading();
	$("#noteContent").hide();
	ajaxGet(url, param, setContent);
}

// 渲染

// 更改信息到左侧
// 定时更改 当前正在编辑的信息到左侧导航
// 或change select. 之前的note, 已经改变了
Note.RenderChangedNote = function(changedNote) {
	if(!changedNote) {
		return;
	}
	
	// 找到左侧相应的note
	var $leftNoteNav = $(t('[noteId="?"]', changedNote.NoteId));
	if(changedNote.Title) {
		$leftNoteNav.find(".item-title").html(changedNote.Title);
	}
	if(changedNote.Desc) {
		$leftNoteNav.find(".desc").html(changedNote.Desc);
	}
	if(changedNote.ImgSrc && !LEA.isMobile) {
		$thumb = $leftNoteNav.find(".item-thumb");
		// 有可能之前没有图片
		if($thumb.length > 0) {
			$thumb.find("img").attr("src", changedNote.ImgSrc);
		} else {
			$leftNoteNav.append(t('<div class="item-thumb" style=""><img src="?"></div>', changedNote.ImgSrc));
		}
		$leftNoteNav.find(".item-desc").removeAttr("style");
	} else if(changedNote.ImgSrc == "") {
		$leftNoteNav.find(".item-thumb").remove(); // 以前有, 现在没有了
		$leftNoteNav.find(".item-desc").css("right", 0);
	}
}

// 清空右侧note信息, 可能是共享的, 
// 此时需要清空只读的, 且切换到note edit模式下
Note.ClearNoteInfo = function() {
	Note.curNoteId = "";
	Tag.ClearTags();
	$("#noteTitle").val("");
	setEditorContent("");
	
	// markdown editor
	$("#wmd-input").val("");
	$("#wmd-preview").html("");
	
	// 只隐藏即可
	$("#noteRead").hide();
}
// 清除noteList导航
Note.ClearNoteList = function() {
	Note.noteItemListO.html(""); // 清空
}

// 清空所有, 在转换notebook时使用
Note.ClearAll = function() {
	// 当前的笔记清空掉
	Note.curNoteId = "";
	
	Note.ClearNoteInfo();
	Note.ClearNoteList();
}

// render到编辑器
// render note
Note.RenderNote = function(note) {
	if(!note) {
		return;
	}
	
	// 切换成view模式
	toggle("view", note.Title)
	
	// title
	// $("#noteTitle").html(note.Title);
	// 当前正在编辑的
	// tags
	// Tag.RenderTags(note.Tags);
}

// render content
Note.RenderNoteContent = function(content) {
	// setEditorContent(content.Content, content.IsMarkdown, content.Preview);
	if(content.IsMarkdown) {
		var c = "<pre>" + content.Content + "</pre>";
	} else {
		var c = content.Content;
	}
	$("#noteContent").hide().html(c).show(100);
	// 只有在renderNoteContent时才设置curNoteId
	Note.curNoteId = content.NoteId;
	
	// 设置图片的大小
	// max-width: 300px
	var maxWidth = 250;
	$("#noteContent img").each(function() {
		var w = $(this).width();
		if(w > maxWidth) {
			$(this).width(maxWidth);
			$(this).height($(this).height()*maxWidth/w); // .css("margin", "auto");
		}
	});
}

// 初始化时渲染最初的notes
/**
    <div id="noteItemList">
	  <!--
      <div href="#" class="item">
        <div class="item-thumb" style="">
          <img src="images/a.gif"/>
        </div>

        <div class="item-desc" style="">
            <p class="item-title">?</p>
            <p class="item-text">
            	?
            </p>
        </div>
      </div>
      -->
*/
// 这里如果notes过多>100个将会很慢!!, 使用setTimeout来分解
Note.RenderNotesC = 0;
Note.RenderNotes = function(notes, forNewNote, isShared) {
	if(!notes || typeof notes != "object" || notes.length < 0) {
		return;
	}
	// 新建笔记时会先创建一个新笔记, 所以不能清空
	if(forNewNote == undefined) {
		forNewNote = false;
	}
	if(!forNewNote) {
		Note.noteItemListO.html(""); // 清空
	}
	
	// 20个一次
	var len = notes.length;
	var c = Math.ceil(len/20);
	
	Note._renderNotes(notes, forNewNote, isShared, 1);
	
	// 先设置缓存
	for(var i = 0; i < len; ++i) {
		var note = notes[i];
		// 不清空
		// 之前是AddNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.SetNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.SetCache(note);
		}
	}
	
	var renderNotesC = ++Note.RenderNotesC;
	for(var i = 1; i < c; ++i) {
		setTimeout(
			(function(i) {
				// 防止还没渲染完就点击另一个notebook了
				return function() {
					if(renderNotesC == Note.RenderNotesC) {
						Note._renderNotes(notes, forNewNote, isShared, i+1);
					}
				}
			})(i), i*2000);
	}
}
Note._renderNotes = function(notes, forNewNote, isShared, tang) { // 第几趟
	var baseClasses = "item-my";
	if(isShared) {
		baseClasses = "item-shared";
	}
	
	var len = notes.length;
	for(var i = (tang-1)*20; i < len && i < tang*20; ++i) {
		var classes = baseClasses;
		if(!forNewNote && i == 0) {
			classes += " item-active";
		}
		var note = notes[i];
		var tmp;
		if(note.ImgSrc && !LEA.isMobile) {
			tmp = t(Note.itemTpl, classes, note.NoteId, note.ImgSrc, note.Title, Notebook.GetNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		} else {
			tmp = t(Note.itemTplNoImg, classes, note.NoteId, note.Title, Notebook.GetNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		}
		if(!note.IsBlog) {
			tmp = $(tmp);
			tmp.find(".item-blog").hide();
		}
		Note.noteItemListO.append(tmp);
		
		/*
		// 共享的note也放在Note的cache一份
		if(isShared) {
			note.IsShared = true; // 注明是共享的
		}
		
		// 不清空
		// 之前是AddNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.SetNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.SetCache(note);
		}
		*/
	}
} 

// 新建一个笔记
// 要切换到当前的notebook下去新建笔记
// isShare时fromUserId才有用
// 3.8 add isMarkdown
Note.NewNote = function(notebookId, isShare, fromUserId, isMarkdown) {
	// 切换编辑器
	switchEditor(isMarkdown);
	
	// 防止从共享read only跳到添加
	Note.HideReadOnly();
	
	Note.StopInterval();
	// 保存当前的笔记
	Note.CurChangedSaveIt();
	
	var note = {NoteId: getObjectId(), Title: "", Tags:[], Content:"", NotebookId: notebookId, IsNew: true, FromUserId: fromUserId, IsMarkdown: isMarkdown}; // 是新的
	// 添加到缓存中
	Note.AddNoteCache(note);
	
	// 是否是为共享的notebook添加笔记, 如果是, 则还要记录fromUserId
	var newItem = "";
	
	var baseClasses = "item-my";
	if(isShare) {
		baseClasses = "item-shared";
	}
	
	var notebook = Notebook.GetNotebook(notebookId);
	var notebookTitle = notebook ? notebook.Title : "";
	var curDate = getCurDate();
	if(isShare) {
		newItem = t(Note.newItemTpl, baseClasses, fromUserId, note.NoteId, note.Title, notebookTitle, curDate, "");
	} else {
		newItem = t(Note.newItemTpl, baseClasses, "", note.NoteId, note.Title, notebookTitle, curDate, "");
	}
	
	// notebook是否是Blog
	if(!notebook.IsBlog) {
		newItem = $(newItem);
		newItem.find(".item-blog").hide();
	}
	
	// 是否在当前notebook下, 不是则切换过去, 并得到该notebook下所有的notes, 追加到后面!
	if(!Notebook.IsCurNotebook(notebookId)) {
		// 先清空所有
		Note.ClearAll();
		
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
		
		// 改变为当前的notebookId
		// 会得到该notebookId的其它笔记
		if(!isShare) {
			Notebook.ChangeNotebookForNewNote(notebookId);
		} else {
			Share.changeNotebookForNewNote(notebookId);
		}
	} else {
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
	}
	
	Note.selectTarget($(t('[noteId="?"]', note.NoteId)));
	
	$("#noteTitle").focus();
	
	Note.RenderNote(note);
	Note.RenderNoteContent(note);
	Note.curNoteId = note.NoteId;
}

// 保存note ctrl + s
Note.saveNote = function(e) {
	var num = e.which ? e.which : e.keyCode;
	// 保存
    if((e.ctrlKey || e.metaKey) && num == 83 ) { // ctrl + s or command + s
    	Note.CurChangedSaveIt();
    	e.preventDefault();
    	return false;
    } else {
    }
};

// 删除或移动笔记后, 渲染下一个或上一个
Note.ChangeToNext = function(target) {
	var $target = $(target);
	var next = $target.next();
	if(!next.length) {
		var prev = $target.prev();
		if(prev.length) {
			next = prev;
		} else {
			// 就它一个
			return;
		}
	}
	
	Note.ChangeNote(next.attr("noteId"));
}

// 删除笔记
// 1. 先隐藏, 成功后再移除DOM
// 2. ajax之 noteId
// Share.deleteSharedNote调用
Note.DeleteNote = function(target, contextmenuItem, isShared) {
	// 如果删除的是已选中的, 赶紧设置curNoteId = null
	if($(target).hasClass("item-active")) {
		// -1 停止定时器
		Note.StopInterval();
		// 不保存
		Note.curNoteId = null;
		// 清空信息
		Note.ClearNoteInfo();
	}
	
	noteId = $(target).attr("noteId");
	if(!noteId) {
		return;
	}
	// 1
	$(target).hide();
	
	// 2
	var note = Note.cache[noteId];
	var url = "/note/deleteNote"
	if(note.IsTrash) {
		url = "/note/deleteTrash";
	}
	
	ajaxGet(url, {noteId: noteId, userId: note.UserId, isShared: isShared}, function(ret) {
		if(ret) {
			Note.ChangeToNext(target);
			
			$(target).remove();
			
			// 删除缓存
			if(note) {
				Note.clearCacheByNotebookId(note.NotebookId)
				delete Note.cache[noteId]
			}
			
			showMsg("删除成功!", 500);
		} else {
			// 弹出信息 popup 不用点确认的
			$(target).show();
			showMsg("删除失败!", 2000);
		}
	});
}

// 显示共享信息
Note.ListNoteShareUserInfo = function(target) {
	var noteId = $(target).attr("noteId");
	showDialogRemote("share/listNoteShareUserInfo", {noteId: noteId});
}
	
// 共享笔记
Note.ShareNote = function(target) {
	var title = $(target).find(".item-title").text();
	showDialog("dialogShareNote", {title: "分享笔记给好友-" + title});
	
	setTimeout(function() {
		$("#friendsEmail").focus();
	}, 500);
	
	var noteId = $(target).attr("noteId");
	shareNoteOrNotebook(noteId, true);
}

// 历史记录
Note.ListNoteContentHistories = function() {
	// 弹框
	$("#leanoteDialog #modalTitle").html(getMsg("history"));
	$content = $("#leanoteDialog .modal-body");
	$content.html("");
	$("#leanoteDialog .modal-footer").html('<button type="button" class="btn btn-default" data-dismiss="modal">关闭</button>');
	options = {}
	options.show = true;
	$("#leanoteDialog").modal(options);
	
	ajaxGet("noteContentHistory/listHistories", {noteId: Note.curNoteId}, function(re) {
		if(!isArray(re)) {$content.html("无历史记录"); return}
		// 组装成一个tab
		var str = 'leanote会保存笔记的最近10份历史记录. <div id="historyList"><table class="table table-hover">';
		note = Note.cache[Note.curNoteId];
		var s = "div"
		if(note.IsMarkdown) {
			s = "pre";
		}
		for (i in re) {
			var content = re[i]
			content.Ab = Note.genAbstract(content.Content, 200);
			str += t('<tr><td seq="?"><? class="each-content">?</?> <div class="btns">时间: <span class="label label-default">?</span> <button class="btn btn-default all">展开</button> <button class="btn btn-primary back">还原</button></div></td></tr>', i, s, content.Ab, s, goNowToDatetime(content.UpdatedTime))
		}
		str += "</table></div>";
		$content.html(str);
		$("#historyList .all").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			var $c = $p.find(".each-content");
			if($(this).text() == "展开") {
				$(this).text("折叠")
				$c.html(re[seq].Content);
			} else {
				$(this).text("展开")
				$c.html(re[seq].Ab);
			}
		});
		
		// 还原
		$("#historyList .back").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			if(confirm("确定要从该版还原? 还原前leanote会备份当前版本到历史记录中.")) {
				// 保存当前版本
				Note.CurChangedSaveIt();
				// 设置之
				note = Note.cache[Note.curNoteId];
				setEditorContent(re[seq].Content, note.IsMarkdown);
				//
				hideDialog();
			}
		});
		
	});
}

// 长微博
Note.html2Image = function(target) {
	var noteId = $(target).attr("noteId");
	showDialog("html2ImageDialog", {title: "发送长微博", postShow: function() {
		ajaxGet("/note/html2Image", {noteId: noteId}, function(ret) {
			if (typeof ret == "object" && ret.Ok) {
				$("#leanoteDialog .weibo span").html("生成成功, 右键图片保存到本地.")
				$("#leanoteDialog .weibo img").attr("src", ret.Id);
				$("#leanoteDialog .sendWeiboBtn").removeClass("disabled");
				$("#leanoteDialog .sendWeiboBtn").click(function() {
					var title = Note.cache[noteId].Title;
					var url = "http://service.weibo.com/share/share.php?title=" + title + " (" + UserInfo.Username + "分享. 来自leanote.com)";
					url += "&pic=" + UrlPrefix + ret.Id;
					window.open(url, "_blank");
				});
			} else {
				$("#leanoteDialog .weibo span").html("对不起, 我们出错了!")
			}
		});
	}});
}

//--------------
// read only

Note.ShowReadOnly = function() {
	Note.isReadOnly = true;
	$("#noteRead").show();
}
Note.HideReadOnly = function() {
	Note.isReadOnly = false;
	$("#noteRead").hide();
}
// read only
Note.RenderNoteReadOnly = function(note) {
	Note.ShowReadOnly();
	$("#noteReadTitle").html(note.Title);
	
	Tag.RenderReadOnlyTags(note.Tags);
	
	$("#noteReadCreatedTime").html(goNowToDatetime(note.CreatedTime));
	$("#noteReadUpdatedTime").html(goNowToDatetime(note.UpdatedTime));
}
Note.RenderNoteContentReadOnly = function(note) {
	$("#noteReadContent").html(note.Content);
}

//---------------------------
// 搜索
// 有点小复杂, 因为速度过快会导致没加载完, 然后就保存上一个 => 致使标题没有
// 为什么会标题没有?
Note.lastSearch = null;
Note.lastKey = null; // 判断是否与上一个相等, 相等就不查询, 如果是等了很久再按enter?
Note.lastSearchTime = new Date();
Note.isOver2Seconds = false;
Note.isSameSearch = function(key) {
	// 判断时间是否超过了1秒, 超过了就认为是不同的
	var now = new Date();
	var duration = now.getTime() - Note.lastSearchTime.getTime();
	Note.isOver2Seconds = duration > 2000 ? true : false;
	if(!Note.lastKey || Note.lastKey != key || duration > 1000) {
		Note.lastKey = key;
		Note.lastSearchTime = now;
		return false;
	}
	
	if(key == Note.lastKey) {
		return true;
	}
	
	Note.lastSearchTime = now;
	Note.lastKey = key;
	return false;
}

Note.SearchNote = function() {
	var val = $("#searchNoteInput").val();
	if(!val) {
		// 需要清空搜索...
		return;
	}
	// 判断是否与上一个是相同的搜索, 是则不搜索
	if(Note.isSameSearch(val)) {
		return;
	}
	
	// 之前有, 还有结束的
	if(Note.lastSearch) {
		Note.lastSearch.abort();
	}
	
	// 步骤与tag的搜索一样 
	// 1
	Note.CurChangedSaveIt();
	
	// 2 先清空所有
	Note.ClearAll();
	
	// 发送请求之
	// 先取消上一个
	showLoading();
	Note.lastSearch = $.post("/note/searchNote", {key: val}, function(notes) {
		hideLoading();
		if(notes) {
			// 成功后设为空
			Note.lastSearch = null;
			// renderNotes只是note列表加载, 右侧笔记详情还没加载
			// 这个时候, 定位第一个, 保存之前的,
			// 	如果: 第一次搜索, renderNotes OK, 还没等到changeNote时
			//		第二次搜索来到, Note.CurChangedSaveIt();
			//		导致没有标题了
			// 不是这个原因, 下面的Note.ChangeNote会导致保存
			
			// 设空, 防止发生上述情况
			// Note.curNoteId = "";
			
			Note.RenderNotes(notes);
			if(!isEmpty(notes)) {
				Note.ChangeNote(notes[0].NoteId, false/*, true || Note.isOver2Seconds*/); // isShare, needSaveChanged?, 超过2秒就要保存
			}
		} else {
			// abort的
		}
	});
	// Note.lastSearch.abort();
}

//----------
//设为blog/unset
Note.SetNote2Blog = function(target) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var isBlog = true;
	if(note.IsBlog != undefined) {
		isBlog = !note.IsBlog;
	}
	// 标志添加/去掉
	if(isBlog) {
		$(target).find(".item-blog").show();
	} else {
		$(target).find(".item-blog").hide();
	}
	ajaxPost("/blog/setNote2Blog", {noteId: noteId, isBlog: isBlog}, function(ret) {
		if(ret) {
			Note.SetNoteCache({NoteId: noteId, IsBlog: isBlog}, false); // 不清空NotesByNotebookId缓存
		}
	});
}

// 设置notebook的blog状态
// 当修改notebook是否是blog时调用
Note.setAllNoteBlogStatus = function(notebookId, isBlog) {
	if(!notebookId) {
		return;
	}
	var notes = Note.GetNotesByNotebookId(notebookId);
	if(!isArray(notes)) {
		return;
	}
	var len = notes.length;
	if(len == 0) {
		for(var i in Note.cache) {
			if(Note.cache[i].NotebookId == notebookId) {
				Note.cache[i].IsBlog = isBlog;
			}
		}
	} else {
		for(var i = 0; i < len; ++i) {
			notes[i].IsBlog = isBlog;
		}
	}
}

// 移动
Note.moveNote = function(target, data) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	if(!note.IsTrash && note.NotebookId == notebookId) {
		return;
	}
	ajaxGet("/note/moveNote", {noteId: noteId, notebookId: notebookId}, function(ret) {
		if(ret && ret.NoteId) {
			if(note.IsTrash) {
				Note.ChangeToNext(target);
				$(target).remove();
				Note.clearCacheByNotebookId(notebookId);
			} else {
				// 不是trash, 移动, 那么判断是当前是否是all下
				// 不在all下, 就删除之
				// 如果当前是active, 那么clearNoteInfo之
				if(!Notebook.CurActiveNotebookIsAll()) {
					Note.ChangeToNext(target);
					if($(target).hasClass("item-active")) {
						Note.ClearNoteInfo();
					}
					$(target).remove();
				} else {
					// 不移动, 那么要改变其notebook title
					$(target).find(".note-notebook").html(Notebook.GetNotebookTitle(notebookId));
				}
				
				// 重新清空cache 之前的和之后的
				Note.clearCacheByNotebookId(note.NotebookId);
				Note.clearCacheByNotebookId(notebookId);
			}
			
			// 改变缓存
			Note.SetNoteCache(ret)
		}
	});
}

// 复制
// data是自动传来的, 是contextmenu数据 
Note.copyNote = function(target, data, isShared) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	// trash不能复制, 不能复制给自己
	if(note.IsTrash || note.NotebookId == notebookId) {
		return;
	}
	
	var url = "/note/copyNote";
	var data = {noteId: noteId, notebookId: notebookId};
	if(isShared) {
		url = "/note/copySharedNote";
		data.fromUserId = note.UserId;
	}
	
	ajaxGet(url, data, function(ret) {
		if(ret && ret.NoteId) {
			// 重新清空cache 之后的
			Note.clearCacheByNotebookId(notebookId);
			// 改变缓存, 添加之
			Note.SetNoteCache(ret)
		}
	});
}

Note.contextmenu = null;
Note.InitContextmenu = function() {
	if(Note.contextmenu) {
		Note.contextmenu.unbind("contextmenu");
	}
	// 得到可移动的notebook
	var notebooksMove = [];
	var notebooksCopy = [];
	$("#notebookNavForNewNote li div.new-note-left").each(function() {
		var notebookId = $(this).attr("notebookId");
		var title = $(this).text();
		var move = {text: title, notebookId: notebookId, action: Note.moveNote}
		var copy = {text: title, notebookId: notebookId, action: Note.copyNote}
		notebooksMove.push(move);
		notebooksCopy.push(copy);
	});
}

//------------------- 事件
$(function() {
	//-----------------
	// for list nav
	$("#noteItemList").on("click", ".item", function(event) {
		event.stopPropagation();
		// 找到上级.item
		var parent = findParents(this, ".item");
		if(!parent) {
			return;
		}
		
		var noteId = parent.attr("noteId");
		if(!noteId) {
			return;
		}
		// 当前的和所选的是一个, 不改变
		if(Note.curNoteId == noteId) {
//			return;
		}
		Note.ChangeNote(noteId);
	});
	
	//------------------
	// 新建笔记
	// 1. 直接点击新建 OR
	// 2. 点击nav for new note
	$("#newNoteBtn").click(function() {
		var notebookId = $("#curNotebookForNewNote").attr('notebookId');
		Note.NewNote(notebookId);
	});
	$("#newNoteMarkdownBtn").click(function() {
		var notebookId = $("#curNotebookForNewNote").attr('notebookId');
		Note.NewNote(notebookId, false, "", true);
	});
	$("#notebookNavForNewNote").on("click", "li div", function() {
		var notebookId = $(this).attr("notebookId");
		if($(this).text() == "Markdown") {
			Note.NewNote(notebookId, false, "", true);
		} else {
			Note.NewNote(notebookId);
		}
	});
	
	//---------------------------
	// 搜索
	$("#searchNoteInput").on("keyup", function(e) {
		Note.SearchNote();
	});
	$("#searchNoteInput").on("keydown", function(e) {
		var theEvent = window.event || arguments.callee.caller.arguments[0];
		if(theEvent.keyCode == 13||theEvent.keyCode == 108) {
			theEvent.preventDefault();
			Note.SearchNote();
			return false;
		}
	});
	
	//--------------------
	Note.InitContextmenu();
	
	//------------
	// 文档历史
	$("#contentHistory").click(function() {
		Note.ListNoteContentHistories()
	});
	
	$("#saveBtn").click(function() {
		Note.CurChangedSaveIt(true);
	});
	
	// blog
	$("#noteItemList").on("click", ".item-blog", function(e) {
		e.preventDefault();
		e.stopPropagation();
		// 得到ID
		var noteId = $(this).parent().attr('noteId');
		window.open("/blog/view/" + noteId);
	});
});

// 定时器启动
//Note.StartInterval();