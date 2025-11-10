# SrunNodeJSLoginScriptForNCU

本项目已停止更新，请关注[SrunGO](https://github.com/Sadak-X/SrunGO)

 NCU深澜校园网node.js登录脚本

## 使用方法

### TL;DR

```bash
   git clone https://github.com/123u414/SrunNodeJSLoginScriptForNCU.git
   cd ./SrunNodeJSLoginScriptForNCU
   npm install
   node ./login.js
```



### 详细步骤

1. 下载安装node.js；
2. 下载本项目；
3. 在项目目录下打开命令行；
4. 执行命令`npm install`；
5. 执行命令`node ./login.js`；
6. 根据提示输入账号和密码；
7. 等待登录完成；
8. 如果登录成功，命令行会输出登录结果；

   ```log
   获取到初始化信息: {
    ...
    error: 'ok',
    error_msg: '',
    ...
    res: 'ok',
    ...
   }
   登录结果: {
    ...
    error: 'ok',
    error_msg: '',
    ...
    res: 'ok',
    ...
    suc_msg: 'login_ok',
    ..
   }
    ```

## 其他

本项目使用Apache-2.0协议开源，欢迎使用和修改。
如果有bug或者建议，欢迎提issue。
~~目前是一个初步版本，适用于登陆IP为 222.204.3.154 的寝室网络（NCU-5G），其他网络暂未测试，蹲一个大佬继续适配完善。~~
已经进行教学区（NCUWLAN）和宿舍区（NCU-5G）的适配，需要切换时请清空或删除配置文件，脚本会重新进行交互式信息获取，根据自己位置选择网络即可。
目前这个方法不够优雅，每次都需要清空内容，重新录入全部的配置信息，未来计划写成启动五秒内无操作自动按照配置文件进行登录，否则按下特定按键时，重新获取当前位置。
另外，通过用户输入获取位置也不够优雅，考虑过基于连接的WIFI名称进行判断，但是有的寝室可能会在光猫下再接一个无线路由器，导致SSID可能不是NCU-5G之类的玩意，这几天再看看有啥特征。

未来计划写个bash把脚本注册到系统服务，实现开机自启，自动登录等功能。同时学习一下luci的开发，做一个WRT能用的图形化配置界面。

由于node.js太重，有空打算用bash重写一下，目前bash的一些库的用法还不熟悉，写出来的东西还有比较大的问题。

写这个玩意的初衷时玩WRT时候在网上闲逛，发现了一个开源的校园网登录脚本，但是不适配自己学校的登陆页面，遂自己动手丰衣足食。感谢[Srun_Openwrt](https://github.com/NahidaBuer/Srun_Openwrt)、[BitSrunLoginGo](https://github.com/Mmx233/BitSrunLoginGo)等项目的启发。

项目登录原理主要靠复制粘贴校园网登陆界面的js代码，感谢原作者的辛苦付出XD。
