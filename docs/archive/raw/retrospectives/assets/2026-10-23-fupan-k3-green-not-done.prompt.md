Use case: scientific-educational
Asset type: AI coding retrospective knowledge-module illustration
Primary request: Create a clean educational knowledge map illustration for one module in an AI coding retrospective. All labels in Simplified Chinese, exactly as given below.

Topic: 测试全过，为什么还会有问题

Core idea to teach:
测试全过只证明「代码符合测试」。还有三个漏洞：测试本身写错了；测试工具自己出错；有些情况根本测不到。

How it appeared in this session:
一个番茄钟网页项目。验收全部通过后，上线前审查发现有一条测试把错误行为写成了「应当如此」；验收用的「冻结页面」命令回报成功，页面其实照常在走；页面切到后台时到点会晚响多久，无头浏览器根本测不到，真人听声音也没测。

Key relationships to show:
Top center: a big green check badge labeled 「测试全过」.
Below it, three branches (like three cracks or three exits), each a card with an icon and a one-line example:
1. 「测试本身写错」 — example: 「把错误行为写成『应当如此』」 (icon: ruler with a wrong mark)
2. 「测试工具出错」 — example: 「命令说成功，其实没生效」 (icon: broken gauge)
3. 「根本测不到」 — example: 「后台标签页、真人听声音」 (icon: eye with a slash)
Bottom banner, one line: 「下次问三句：测得对吗？尺子准吗？哪些没测到？」

User takeaway:
全过不等于没问题；要追问测试本身、测试工具和没测到的地方。

Visual style:
- Educational diagram, not marketing poster
- Clear hierarchy, readable short Chinese labels, minimal decoration
- Simple rounded boxes, arrows, callouts, small symbolic icons
- Light warm off-white paper background, dark ink text; green only on the top check badge, brick red (#B5523B) accents on the three problem cards, muted gray-teal (#5F8A8B) for the bottom banner
- Keep text short and large enough to read; use only the labels listed above, do not add other text, numbers or English
- No code screenshots, no fake UI, no people
- No purple-blue gradients, no decorative blobs, no watermark

Output: A single 16:9 PNG knowledge map suitable for embedding in a Markdown retrospective.
