package service

import (
	"labix.org/v2/mgo/bson"
	"github.com/leanote/leanote/app/db"
	"github.com/leanote/leanote/app/info"
	. "github.com/leanote/leanote/app/lea"
	"fmt"
)

// 找回密码
// 修改密码
var overHours = 2.0 // 小时后过期

type PwdService struct {
}

// 1. 找回密码, 通过email找用户, 
// 用户存在, 生成code
func (this *PwdService) FindPwd(email string) (ok bool, msg string) {
	ok = false
	userId := userService.GetUserId(email)
	if userId == "" {
		msg = "用户不存在"
		return
	}
	
	token := tokenService.NewToken(userId, email, info.TokenPwd)
	if token == "" {
		return false, "db error"
	}
	
	// 发送邮件
	url := "http://leanote.com/findPassword/" + token
	body := fmt.Sprintf("请点击链接修改密码: <a href='%v'>%v</a>. %v小时后过期.", url, url, int(overHours));
	if !SendEmail(email, "leanote-找回密码", "找回密码", body) {
		return false, "邮箱发送失败"
	}
	
	ok = true
	return
}

// 修改密码
// 先验证
func (this *PwdService) UpdatePwd(token, pwd string) (bool, string) {
	var tokenInfo info.Token
	var ok bool
	var msg string
	
	// 先验证
	if ok, msg, tokenInfo = tokenService.VerifyToken(token, info.TokenPwd); !ok {
		return ok, msg
	}
	
	// 修改密码之
	ok = db.UpdateByQField(db.Users, bson.M{"_id": tokenInfo.UserId}, "Pwd", Md5(pwd))
	
	// 删除token
	tokenService.DeleteToken(tokenInfo.UserId.Hex(), info.TokenPwd)
	
	return ok, ""
}