Use case: scientific-educational
Asset type: AI coding retrospective knowledge-module illustration
Primary request: Create a clean educational knowledge map illustration for one module in an AI coding retrospective. All labels in Simplified Chinese, exactly as given below.

Topic: 写代码的和验收的要分开

Core idea to teach:
写代码的一方容易认定自己写对了，它写的测试也带着同样的理解。把「写」和「查」交给不同的执行者；查的一方只看结果和事先定好的标准，目标是想办法证明它错。

How it appeared in this session:
一个番茄钟网页项目。Codex 写代码，Claude 写任务书、定验收标准并亲自验收：把实现换成什么都不做的空壳，测试必须全部失败；把关键规则故意改坏，每一处都必须有测试报警；之后 QA 再按检查表独立测一遍。

Key relationships to show:
Left: 「写的一方」 box -> arrow labeled 「交回代码和测试」 -> Right: 「查的一方」 box
Above the arrow: a document labeled 「事先写好的验收标准」 feeding both sides
Under 「查的一方」, three stacked check steps:
1. 「换成空壳：测试应全失败」
2. 「故意改坏：测试应报警」
3. 「按检查表独立再测」
Bottom banner, one line: 「不看它说全过，设法证明它错」

Visual style:
- Educational diagram, not marketing poster
- Clear hierarchy, readable short Chinese labels, minimal decoration
- Simple rounded boxes, arrows, callouts, small symbolic icons
- Light warm off-white paper background, dark ink text, accents brick red (#B5523B) and muted gray-teal (#5F8A8B)
- Use only the labels listed above, no other text, numbers or English
- No code screenshots, no fake UI, no people
- No purple-blue gradients, no decorative blobs, no watermark

Output: A single 16:9 PNG knowledge map suitable for embedding in a Markdown retrospective.
