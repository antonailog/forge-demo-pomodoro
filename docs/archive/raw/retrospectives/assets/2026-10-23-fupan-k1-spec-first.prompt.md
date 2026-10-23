Use case: scientific-educational
Asset type: AI coding retrospective knowledge-module illustration
Primary request: Create a clean educational knowledge map illustration for one module in an AI coding retrospective. All labels in Simplified Chinese, exactly as given below.

Topic: 先写需求规格和验收检查表

Core idea to teach:
动手之前，先写清「做成什么样算对」。需求规格由三块组成：场景（遇到什么情况 → 应该怎样）、出错时怎么表现、验收检查表。后面写代码、验收、审查，都拿同一份检查表当尺子。

How it appeared in this session:
一个番茄钟网页项目。需求规格写了六块功能的场景、出错时的表现和验收检查表；写代码的 AI 照它实现，验收的 AI 照它一条条测，审查也照它判断；写代码时还发现规格里有三处没写到的情形，补回了规格。

Key relationships to show (left to right flow, then fan-out):
「一句想法」 -> 「追问与讨论」 -> 「需求规格」
「需求规格」 contains three stacked parts: 「场景：遇到什么 → 该怎样」 / 「出错时怎么表现」 / 「验收检查表」
「验收检查表」 -> fans out to three boxes: 「写代码」 「验收」 「审查」, each with a small ruler icon meaning "同一把尺子"
A thin dashed arrow from 「写代码」 back to 「需求规格」 labeled 「发现空白 → 补回规格」

User takeaway (bottom banner, one line):
「先说清怎样算对，再让 AI 动手」

Visual style:
- Educational diagram, not marketing poster
- Clear hierarchy, readable short Chinese labels, minimal decoration
- Simple rounded boxes, arrows, callouts, small symbolic icons (lightbulb for idea, document for spec, checklist, ruler)
- Light warm off-white paper background, dark ink text, two muted accents only: brick red (#B5523B) for the spec block, muted gray-teal (#5F8A8B) for the three downstream boxes
- Keep text short and large enough to read; use only the labels listed above, do not add other text, numbers or English
- No code screenshots, no fake UI, no people
- No purple-blue gradients, no decorative blobs, no watermark

Output: A single 16:9 PNG knowledge map suitable for embedding in a Markdown retrospective.
