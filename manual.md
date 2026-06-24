# Blog JSON Specification

## Overview

Each blog article is stored as a separate JSON file.

Example:

blogs/
├── rise-of-ai-agents.json
├── future-of-llms.json
├── ai-search-2026.json

A blog file contains:

1. Metadata
2. Header Image
3. Content Blocks

---

# Metadata Fields

## slug

Unique identifier.

Used in URLs.

Example:

"slug": "rise-of-ai-agents"

Article URL:

?slug=rise-of-ai-agents

Rules:

* lowercase only
* use hyphens
* no spaces
* must be unique

---

## title

Article title displayed to readers.

Example:

"title": "The Rise of AI Agents"

---

## author

Author name.

Example:

"author": "AI Writer"

---

## date

Publication date.

Format:

YYYY-MM-DD

Example:

"date": "2026-06-24"

---

## excerpt

Short summary shown on homepage cards.

Example:

"excerpt": "AI agents are transforming software development."

Recommended:

20-40 words.

---

## headerImage

Main image displayed at top.

Example:

"headerImage": "images/agents.jpg"

---

# Content Blocks

The content field is an array.

Example:

"content": [
{...},
{...},
{...}
]

Each item is a content block.

---

# Paragraph Block

Used for normal text.

{
"type": "paragraph",
"text": "Artificial intelligence is entering a new era."
}

Fields:

type
text

---

# Heading Block

Used for section titles.

{
"type": "heading",
"level": 2,
"text": "What Are AI Agents?"
}

Fields:

type
level
text

Levels:

1 = Main title
2 = Major section
3 = Subsection
4 = Minor heading

Recommended:

Use only 2 and 3.

---

# Image Block

Used for inline images.

{
"type": "image",
"url": "images/workflow.jpg",
"alt": "Agent Workflow",
"caption": "Typical AI Agent Workflow"
}

Fields:

type
url
alt
caption

---

# Quote Block

Used for highlighted statements.

{
"type": "quote",
"text": "AI Agents are the future of software.",
"author": "Industry Expert"
}

Fields:

type
text
author

---

# List Block

Unordered list:

{
"type": "list",
"style": "unordered",
"items": [
"Planning",
"Reasoning",
"Memory"
]
}

Ordered list:

{
"type": "list",
"style": "ordered",
"items": [
"Step One",
"Step Two",
"Step Three"
]
}

Fields:

type
style
items

---

# Code Block

For source code.

{
"type": "code",
"language": "javascript",
"content": "console.log('Hello');"
}

Fields:

type
language
content

---

# Table Block

Recommended future support.

{
"type": "table",
"headers": [
"Model",
"Context Window"
],
"rows": [
["GPT-5", "1M"],
["Gemini", "2M"]
]
}

Fields:

type
headers
rows

---

# FAQ Block

Recommended future support.

{
"type": "faq",
"question": "What is an AI Agent?",
"answer": "An AI system capable of autonomous actions."
}

Fields:

type
question
answer

---

# Callout Block

For warnings or important notes.

{
"type": "callout",
"style": "info",
"text": "AI agents require monitoring."
}

Styles:

info
warning
success
danger

---

# Blog Example

{
"slug": "rise-of-ai-agents",

"title": "The Rise of AI Agents",

"author": "AI Writer",

"date": "2026-06-24",

"excerpt": "AI agents are transforming automation.",

"headerImage": "images/agents.jpg",

"content": [

```
{
  "type": "paragraph",
  "text": "Artificial intelligence is entering a new era."
},

{
  "type": "heading",
  "level": 2,
  "text": "What Are AI Agents?"
},

{
  "type": "paragraph",
  "text": "Agents can reason, plan and execute tasks."
},

{
  "type": "list",
  "style": "unordered",
  "items": [
    "Planning",
    "Reasoning",
    "Memory"
  ]
}
```

]
}

---

# Rules for Gemini

Always output valid JSON.

Never output HTML.

Never output Markdown.

Use content blocks only.

Every article must include:

* slug
* title
* author
* date
* excerpt
* headerImage
* content

Content should contain:

* minimum 5 paragraphs
* minimum 2 headings
* at least 1 list

Optional:

* image
* quote
* code
* faq
* table
* callout
