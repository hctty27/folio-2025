const exactTranslations = new Map(Object.entries({
    "Bruno's": "HC 的作品集",
    "Bruno's Home": "HC 的主页",
    "Interact": "交互",
    "Unstuck": "脱困",
    "Previous": "上一个",
    "Next": "下一个",
    "Open": "打开",
    "Close": "关闭",
    "Welcome!": "欢迎！",
    "My name is Bruno Simon, and I'm a creative developer (mostly for the web).": "我叫 HC，是一名开发者（主要从事 后端 开发）。",
    "This is my portfolio. Please drive around to learn more about me and discover the many secrets of this world.": "这是我的个人作品集。请驾驶小车四处探索，了解更多关于我的信息，并发现这个世界里的诸多秘密。",
    "And don't break anything!": "还有，别弄坏任何东西！",
    "Options": "设置",
    "Audio": "音频",
    "Toggles sound": "切换声音",
    "Quality": "画质",
    "Toggles some effects": "切换部分特效",
    "High": "高",
    "Low": "低",
    "I'm stuck!": "我被卡住了！",
    "Teleports you to the closest respawn": "传送到最近的重生点",
    "Respawn": "重生",
    "Reset": "重置",
    "Resets every object": "重置所有物体",
    "Renderer": "渲染器",
    "Best for performance": "性能表现最佳",
    "Server": "服务器",
    "Pending": "连接中",
    "Online": "在线",
    "Offline": "离线",
    "Server connected": "服务器已连接",
    "Server disconnected": "服务器连接已断开",
    "Enjoy the multiplayer features": "享受多人在线功能",
    "Should be back soon": "应该很快恢复",
    "Your browser is not compatible with WebGPU resulting in performance loss": "你的浏览器不支持 WebGPU，性能可能会下降",
    "Your browser is": "你的浏览器",
    "not compatible": "不兼容",
    "with WebGPU resulting in performance loss": "WebGPU，可能导致性能下降",
    "Enjoy the": "享受",
    "multiplayer": "多人在线",
    "features": "功能",
    "Mouse Keyboard": "鼠标和键盘",
    "Mobile Tablet": "手机和平板",
    "Gamepad": "手柄",
    "or": "或",
    "ARROWS": "方向键",
    "Move around": "移动",
    "Boost": "加速",
    "Brake": "刹车",
    "Jump": "跳跃",
    "Map": "地图",
    "Mute": "静音",
    "Post a whisper": "发布留言",
    "Activate hydraulics": "启用液压悬挂",
    "LEFT CLICK (DRAG)": "按住左键拖动",
    "Move camera": "移动镜头",
    "Honk": "鸣笛",
    "One finger": "单指",
    "Move the car": "移动车辆",
    "Two fingers": "双指",
    "Move camera / zoom": "移动镜头 / 缩放",
    "Tap (on the car)": "点击车辆",
    "Interact / Exit": "交互 / 退出",
    "Accelerate": "前进",
    "Backward accelerate": "倒车",
    "Hydraulics": "液压悬挂",
    "Joystick Left": "左摇杆",
    "Turn wheels": "转向",
    "Joystick Left (press)": "按下左摇杆",
    "Joystick Right": "右摇杆",
    "Joystick Right (press)": "按下右摇杆",
    "Zoom in/out": "放大 / 缩小",
    "Select": "选择键",
    "Start": "开始键",
    "Pause": "暂停",
    "Controls": "操作说明",
    "CTRL LEFT": "左 Ctrl",
    "SPACE": "空格",
    "NUM KEYS": "数字键",
    "NUM PAD": "数字键盘",
    "Achievements": "成就",
    "Rewards": "奖励",
    "Unlock at": "完成以下数量后解锁",
    "Reset achievements": "重置成就",
    "Are you sure?": "确定要重置吗？",
    "Definitely?": "真的确定吗？",
    "Done!": "已重置！",
    "Circuit": "赛道",
    "Server currently offline. Scores can't be saved.": "服务器当前离线，成绩无法保存。",
    "No score yet today": "今天还没有成绩",
    "Resets in": "距离重置",
    "Restart": "重新开始",
    "End": "结束",
    "Your time": "你的用时",
    "Sorry, you didn't make it to the top 10.": "很遗憾，你没有进入前 10 名。",
    "Submit": "提交",
    "Start race!": "开始比赛！",
    "Bumpers": "防撞护栏",
    "Change song": "切换歌曲",
    "Now playing": "正在播放",
    "now": "现在",
    "Leave a whisper": "留下留言",
    "Whispers are messages left by visitors.": "留言是访客留下的信息。",
    "- Everyone can see them": "- 所有人都能看到",
    "- New whispers remove old ones (max 30)": "- 新留言会替换旧留言（最多 30 条）",
    "- One whisper per user": "- 每位用户只能留一条",
    "- Choose a flag": "- 选择一面旗帜",
    "- No slur!": "- 请勿使用侮辱性语言！",
    "- Max 30 characters": "- 最多 30 个字符",
    "Everyone can see them": "所有人都能看到",
    "New whispers remove old ones (max 30)": "新留言会替换旧留言（最多 30 条）",
    "One whisper per user": "每位用户只能留一条",
    "Choose a flag": "选择一面旗帜",
    "No slur!": "请勿使用侮辱性语言！",
    "Max 30 characters": "最多 30 个字符",
    "Server currently offline": "服务器当前离线",
    "Search…": "搜索…",
    "Search...": "搜索…",
    "No result": "没有结果",
    "Your message": "你的留言",
    "Your message here": "在这里输入留言",
    "Behind the scene": "幕后制作",
    "Thank you for visiting my portfolio!": "感谢你访问我的作品集！",
    "If you are curious about the stack and how I built this project, here’s everything you need to know.": "如果你对技术栈和项目的制作过程感兴趣，下面是全部信息。",
    "Three.js is the library I’m using to render this 3D world.": "Three.js 是我用于渲染这个 3D 世界的库。",
    "is the library I’m using to render this 3D world.": "是我用于渲染这个 3D 世界的库。",
    "If you want to learn Three.js, I got you covered with this huge course.": "想学习 Three.js，可以看看这套完整课程。",
    "It contains everything you need to start building awesome stuff with Three.js (and much more).": "它涵盖了使用 Three.js 开始创作精彩项目所需的一切内容，而且远不止这些。",
    "Devlogs": "开发日志",
    "I’ve been making devlogs since the very start of this portfolio and you can find them all on my Youtube channel.": "从项目开始之初，我就一直在制作开发日志，你可以在我的 YouTube 频道找到全部内容。",
    "Youtube channel": "YouTube 频道",
    "Youtube": "YouTube",
    "Source code": "源代码",
    "The code is available on GitHub under MIT license. Even the Blender files are there, so have fun!": "代码已发布在 GitHub，并采用 MIT 许可证。其中甚至包含 Blender 文件，尽情探索吧！",
    "For security reasons, I’m not sharing the server code, but the portfolio works without it.": "出于安全原因，我没有公开服务端代码，但没有服务端时作品集仍可运行。",
    "Musics": "音乐",
    "The music you hear was made especially for this portfolio by the awesome Kounine (Linktree).": "你听到的音乐由出色的 Kounine 专门为这个作品集创作（Linktree）。",
    "They are now under CC0 license, meaning you can do whatever you want with them!": "这些音乐现采用 CC0 许可证，意味着你可以自由使用它们！",
    "Download them here.": "可在这里下载。",
    "Some more links": "更多链接",
    "Physics library ⇒": "物理引擎 ⇒",
    "Audio library ⇒": "音频库 ⇒",
    "Fonts ⇒": "字体 ⇒",
    "huge course": "完整课程",
    "MIT license": "MIT 许可证",
    "CC0 license": "CC0 许可证",
    "here": "这里",
    "Public server": "公共服务器",
    "Come hang out with the community, show us your projects and ask us anything.": "来和社区成员一起交流，展示你的项目，或向我们提问。",
    "Come hang out with the community.": "来和社区成员一起交流。",
    "Join server": "加入服务器",
    "Private messages": "私信",
    "Contact me directly.": "直接联系我。",
    "I have to warn you, I try to answer everyone, but it might take a while.": "提前说明：我会尽量回复每个人，但有时可能需要一些时间。",
    "Start chating": "开始聊天",
    "Projects": "项目",
    "Project": "项目",
    "Lab": "实验室",
    "Social": "社交",
    "Bowling": "保龄球",
    "Cookie": "Cookie",
    "Cookies": "Cookie",
    "Cookie Stand": "Cookie 摊位",
    "Accept cookie": "接受 Cookie",
    "Time Machine": "时光机",
    "Altar": "祭坛",
    "Res(e)t": "重（置）",
    "developer": "开发",
    "formater": "课程设计",
    "WebGL developer": "WebGL 开发",
    "Front developer": "前端开发",
    "role": "职责",
    "at": "任职于",
    "with": "合作方",
    "Visit": "访问",
    "Mail": "邮箱",
    "Black Hole": "黑洞",
    "Infinite World": "无限世界",
    "My Room in 3D": "我的 3D 房间",
    "Particles System": "粒子系统",
    "Stylized Low Poly": "风格化低多边形",
    "Holographic terrain": "全息地形",
    "Woodkid Volcano Robot": "Woodkid 火山机器人",
    "Bounce Friday": "弹跳星期五",
    "VFX flames": "VFX 火焰",
    "VFX tornado": "VFX 龙卷风",
    "DOOM Portal": "DOOM 传送门",
    "Organic Sphere": "有机球体",
    "Attractors": "吸引子",
    "I’m going on an adventure!": "我要去冒险了！",
    "I'm going on an adventure!": "我要去冒险了！",
    "Get out of the landing area.": "离开出生区域。",
    "Traveler": "旅行者",
    "Vist every area.": "访问所有区域。",
    "Visit every area.": "访问所有区域。",
    "But can you fix the wifi?": "不过你会修 Wi-Fi 吗？",
    "Check every project in the projects area.": "查看项目区域里的每个项目。",
    "I'm a bit of a scientist myself": "我也算半个科学家",
    "Check every project in the lab area.": "查看实验室里的每个项目。",
    "Wake & bake": "起床烤饼干",
    "Making some dough": "开始揉面",
    "So baked right now": "烤得正香",
    "Cookie Clicker": "Cookie 点击器",
    "It's About Sending A Message": "重要的是传递信息",
    "Post a whisper.": "发布一条留言。",
    "Under the sea": "海底世界",
    "Go make friend with the fishes.": "去和鱼儿交个朋友。",
    "Turtle": "翻车了",
    "Get upside down.": "让车辆底朝天。",
    "Teeth first": "脸先着地",
    "Do a front flip and land on your 4 wheels.": "完成前空翻并四轮着地。",
    "Flip of faith": "信仰之翻",
    "Do a back flip and land on your 4 wheels.": "完成后空翻并四轮着地。",
    "Lowrider": "低底盘",
    "Use the vehicle suspensions.": "使用车辆液压悬挂。",
    "Honk me like one of your french driver.": "像法国司机一样尽情鸣笛。",
    "Great Explosion Murder God Dynamight": "大爆炸杀神·炸裂",
    "Blow up every explosive crate.": "引爆所有炸药箱。",
    "Limit the sky": "天空才是极限",
    "F*** it, dude. Let's go bowling": "管他的，去打保龄球吧",
    "Accomplished a strike.": "完成一次全中。",
    "Do not disturb": "请勿打扰",
    "Knock down the latrine.": "撞倒厕所。",
    "Participation medal": "参与奖",
    "Finish a race.": "完成一场比赛。",
    "KA-CHOW!": "咔嚓！",
    "Early Bird gets the Worm": "早起的鸟儿有虫吃",
    "Make it to the leaderboard.": "进入排行榜。",
    "Don’t you have work to do?": "你不用工作吗？",
    "Don't you have work to do?": "你不用工作吗？",
    "Spend a full day cycle here in one go.": "一次连续经历完整的昼夜循环。",
    "Baby step": "小小一步",
    "Are we there yet?": "还没到吗？",
    "Honey, I’m home!": "亲爱的，我回来了！",
    "Honey, I'm home!": "亲爱的，我回来了！",
    "One for the god of Chaos": "献给混沌之神",
    "Sacrifice yourself into the altar.": "把自己献祭到祭坛中。",
    "Witness me!": "见证我！",
    "Witness a cataclysm": "见证一场灾变。",
    "Do you want to build a snowman?": "你想堆个雪人吗？",
    "Witness snowy weather.": "经历下雪天气。",
    "I’m singing in the rain": "我在雨中歌唱",
    "I'm singing in the rain": "我在雨中歌唱",
    "Witness a rainy weather.": "经历下雨天气。",
    "1.21 Gigawatts!": "1.21 吉瓦！",
    "Get hit by a lightning.": "被闪电击中。",
    "Gamer instinct": "玩家直觉",
    "What did you expect? A treasure?": "你期待什么？宝藏吗？",
    "You’re my only fan": "你是我唯一的粉丝",
    "You're my only fan": "你是我唯一的粉丝",
    "Spawn a fan.": "生成一个风扇。",
    "Clean your room": "收拾房间",
    "Put back everything as it was.": "把所有东西恢复原状。",
    "Revolution!": "革命！",
    "Tear that statue down.": "推倒那座雕像。",
    "Up up down down…": "上上下下……",
    "Up up down down...": "上上下下……",
    "You know the rest.": "你知道后面的。",
    "It's not a bug, it's a feature": "这不是 Bug，是特性",
    "Access the debug UI.": "进入调试界面。",
    "Hacker": "黑客",
    "This one can’t be achieved.": "这个成就无法正常获得。",
    "This one can't be achieved.": "这个成就无法正常获得。",
    "My name is": "我叫",
    ", and I'm a": "，我是一名",
    "creative developer": "创意开发者",
    "(mostly for the web).": "（主要从事 Web 开发）。",
    "It was created by": "它由",
    "followed by hundreds of awesome developers, one of which being Sunag": "以及数百位优秀开发者共同维护，其中包括 Sunag",
    "who added": "，他加入了",
    "enabling the use of both WebGL and WebGPU, making this portfolio possible.": "，使项目能够同时使用 WebGL 和 WebGPU，也让这个作品集成为可能。",
    "If you want to learn Three.js, I got you covered with this": "想学习 Three.js，可以看看这套",
    "I’ve been making devlogs since the very start of this portfolio and you can find them all on my": "从项目开始之初，我就一直在制作开发日志，你可以在我的",
    "The code is available on": "代码已发布在",
    "under": "，采用",
    ". Even the Blender files are there, so have fun!": "。其中甚至包含 Blender 文件，尽情探索吧！",
    "The music you hear was made especially for this portfolio by the awesome Kounine": "你听到的音乐由出色的 Kounine 专门为这个作品集创作",
    "They are now under": "这些音乐现采用",
    ", meaning you can do whatever you want with them!": "，意味着你可以自由使用它们！",
    "Download them": "下载地址",
    "Come hang out with the community": "来和社区成员一起交流",
    ", show us your projects and ask us anything": "，展示你的项目，或向我们提问",
    "Accept": "接受",
    "cookies.": "块 Cookie。",
    "Check every project in the": "查看",
    "projects": "项目",
    "lab": "实验室",
    "area.": "区域里的每个项目。",
    "Finish a race in less than": "在",
    "Reach": "到达",
    "meters high.": "米高度。",
    "OFFLINE": "离线",
    "NO SCORE YET TODAY": "今天还没有成绩",
    "Career": "职业经历",
    "Landing": "出生点",
    "Behind": "幕后",
    "the scene": "制作"
}))

const dynamicTranslations = [
    [/^Unlock at\s+(\d+)$/i, (_match, count) => `完成 ${count} 项成就后解锁`],
    [/^Resets in\s+(.+)$/i, (_match, time) => `将在 ${translateText(time)} 后重置`],
    [/^in\s+(.+)$/i, (_match, time) => `${translateText(time)} 后`],
    [/^(\d+)h\s+(\d+)min\s+(\d+)s$/i, (_match, hours, minutes, seconds) => `${hours}小时 ${minutes}分钟 ${seconds}秒`],
    [/^(\d+)h\s+(\d+)min$/i, (_match, hours, minutes) => `${hours}小时 ${minutes}分钟`],
    [/^(\d+)h\s+(\d+)s$/i, (_match, hours, seconds) => `${hours}小时 ${seconds}秒`],
    [/^(\d+)min\s+(\d+)s$/i, (_match, minutes, seconds) => `${minutes}分钟 ${seconds}秒`],
    [/^(\d+)h$/i, (_match, hours) => `${hours}小时`],
    [/^(\d+)min$/i, (_match, minutes) => `${minutes}分钟`],
    [/^(\d+)s$/i, (_match, seconds) => `${seconds}秒`],
    [/^Drive\s+(\d+)km\.$/i, (_match, distance) => `驾驶 ${distance} 公里。`],
    [/^Accept\s+(\d+)\s+cookies?\.$/i, (_match, count) => `接受 ${count} 块 Cookie。`],
    [/^Finish a race in less than\s+(\d+)s\.$/i, (_match, seconds) => `在 ${seconds} 秒内完成比赛。`],
    [/^Reach\s+(\d+)\s+meters?\s+high\.$/i, (_match, height) => `到达 ${height} 米高度。`]
]

const countryDisplayNames = typeof Intl?.DisplayNames === 'function'
    ? new Intl.DisplayNames(['zh-CN'], { type: 'region' })
    : null

function getWhitespace(value)
{
    return {
        leading: value.match(/^\s*/)?.[0] ?? '',
        trailing: value.match(/\s*$/)?.[0] ?? ''
    }
}

export function translateText(value)
{
    if(typeof value !== 'string' || value.length === 0)
        return value

    const compact = value.replace(/\s+/g, ' ').trim()
    if(compact.length === 0)
        return value

    const whitespace = getWhitespace(value)

    const countryMatch = compact.match(/^.+\s+\(([a-z]{2})\)$/i)
    if(countryMatch && countryDisplayNames)
    {
        const code = countryMatch[1].toUpperCase()
        const countryName = countryDisplayNames.of(code)
        if(countryName && countryName !== code)
            return `${whitespace.leading}${countryName} (${code.toLowerCase()})${whitespace.trailing}`
    }

    let translated = exactTranslations.get(compact)
    if(!translated)
    {
        for(const [ pattern, replacement ] of dynamicTranslations)
        {
            if(pattern.test(compact))
            {
                translated = compact.replace(pattern, replacement)
                break
            }
        }
    }

    if(!translated)
        return value

    return `${whitespace.leading}${translated}${whitespace.trailing}`
}

function patchCanvasContext(ContextClass)
{
    if(!ContextClass?.prototype || ContextClass.prototype.__folioChineseLocalization)
        return

    const prototype = ContextClass.prototype
    const originalMeasureText = prototype.measureText
    const originalFillText = prototype.fillText
    const originalStrokeText = prototype.strokeText

    if(typeof originalMeasureText === 'function')
    {
        prototype.measureText = function(text)
        {
            return originalMeasureText.call(this, translateText(String(text)))
        }
    }

    if(typeof originalFillText === 'function')
    {
        prototype.fillText = function(text, x, y, maxWidth)
        {
            const translated = translateText(String(text))
            return arguments.length >= 4
                ? originalFillText.call(this, translated, x, y, maxWidth)
                : originalFillText.call(this, translated, x, y)
        }
    }

    if(typeof originalStrokeText === 'function')
    {
        prototype.strokeText = function(text, x, y, maxWidth)
        {
            const translated = translateText(String(text))
            return arguments.length >= 4
                ? originalStrokeText.call(this, translated, x, y, maxWidth)
                : originalStrokeText.call(this, translated, x, y)
        }
    }

    Object.defineProperty(prototype, '__folioChineseLocalization', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
    })
}

function shouldSkipElement(element)
{
    if(!(element instanceof Element))
        return false

    return Boolean(element.closest('script, style, noscript, code, pre, svg'))
}

function translateAttributes(element)
{
    if(!(element instanceof Element) || shouldSkipElement(element))
        return

    for(const attributeName of [ 'placeholder', 'title', 'aria-label', 'alt' ])
    {
        if(!element.hasAttribute(attributeName))
            continue

        const current = element.getAttribute(attributeName)
        const translated = translateText(current)
        if(translated !== current)
            element.setAttribute(attributeName, translated)
    }
}

function translateTextNode(textNode)
{
    const parent = textNode.parentElement
    if(!parent || shouldSkipElement(parent))
        return

    const current = textNode.nodeValue

    // Keep visitor-authored messages untouched while still translating the empty-state prompt.
    if(parent.isContentEditable && current.replace(/\s+/g, ' ').trim() !== 'Your message here')
        return

    const translated = translateText(current)
    if(translated !== current)
        textNode.nodeValue = translated
}

function translateDom(root)
{
    if(root.nodeType === Node.TEXT_NODE)
    {
        translateTextNode(root)
        return
    }

    if(!(root instanceof Element) && root !== document)
        return

    if(root instanceof Element)
        translateAttributes(root)

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode = walker.nextNode()
    while(textNode)
    {
        translateTextNode(textNode)
        textNode = walker.nextNode()
    }

    if(root.querySelectorAll)
    {
        for(const element of root.querySelectorAll('[placeholder], [title], [aria-label], [alt]'))
            translateAttributes(element)
    }
}

function translateMetadata()
{
    document.documentElement.lang = 'zh-CN'
    document.title = 'Bruno 的作品集'

    const description = 'Bruno Simon 的创意作品集'
    for(const selector of [
        'meta[name="description"]',
        'meta[itemprop="description"]',
        'meta[name="twitter:description"]',
        'meta[property="og:description"]'
    ])
    {
        const element = document.querySelector(selector)
        if(element)
            element.setAttribute('content', description)
    }

    const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if(appTitle)
        appTitle.setAttribute('content', 'Bruno 的作品集')
}

function initializeLocalization()
{
    patchCanvasContext(globalThis.CanvasRenderingContext2D)
    patchCanvasContext(globalThis.OffscreenCanvasRenderingContext2D)

    const start = () =>
    {
        translateMetadata()
        translateDom(document)

        const observer = new MutationObserver((mutations) =>
        {
            for(const mutation of mutations)
            {
                if(mutation.type === 'characterData')
                {
                    translateTextNode(mutation.target)
                }
                else if(mutation.type === 'attributes')
                {
                    translateAttributes(mutation.target)
                }
                else
                {
                    for(const node of mutation.addedNodes)
                        translateDom(node)
                }
            }
        })

        observer.observe(document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: [ 'placeholder', 'title', 'aria-label', 'alt' ]
        })
    }

    if(document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', start, { once: true })
    else
        start()
}

if(typeof document !== 'undefined')
    initializeLocalization()
