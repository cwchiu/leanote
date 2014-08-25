package main

import (
	"fmt"
	"os"
	"bufio"
	"strings"
	"encoding/json"
)

// convert revel msg to js msg

//var msgBasePath = "/home/test/leanote/leanote/messages/"
//var targetBasePath = "/Users/life/Documents/Go/package/src/github.com/leanote/leanote/public/js/i18n/"
func parse(filename string) {
    //msgBasePath := revel.BasePath + "/messages/";    
	//file, err := os.Open(msgBasePath + filename)
	file, err := os.Open(filename)
	reader := bufio.NewReader(file)
	msg := map[string]string{}
	if err != nil {
		fmt.Println(err)
		return
	}
    
	for true {
		line, _, err := reader.ReadLine()
		
		if err != nil {
			break
		}
		
		if len(line) == 0 {
			continue
		}
		// 对每一行进行处理
		if line[0] == '#' || line[1] == '#' {
			continue;
		}
		lineStr := string(line)
		
		// 找到第一个=位置
		pos := strings.Index(lineStr, "=")
		
		if pos < 0 {
			continue;
		}
		
		key := string(line[0:pos])
		value := string(line[pos+1:])
		
//		fmt.Println(lineStr)
//		fmt.Println(value)
		
		msg[key] = value
	}
	
	// JSON
	b, _ := json.Marshal(msg)
	str := string(b)
	fmt.Println(str);
    
	// targetBasePath := revel.BasePath + "/public/js/i18n/";
	// targetName := targetBasePath + filename + ".js"
	// file2, err2 := os.OpenFile(targetName, os.O_RDWR|os.O_CREATE, 0644)
	file2, err2 := os.OpenFile(filename + ".js", os.O_RDWR|os.O_CREATE, 0644)
	if err2 != nil {
		file2, err2 = os.Create(filename + ".js")
	}
	file2.WriteString("var MSG = " + str + ";")
}

// 生成js的i18n文件
func main() {
    if len(os.Args) > 1 {
        parse(os.Args[1])
    }
	//parse("msg.en")
	//parse("msg.zh")
}
