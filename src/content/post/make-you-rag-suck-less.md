---
title: "Make your RAG Suck Less"
description: "Common pitfalls in with designing and implementing RAGs"
publishDate: "11 June 2024"
tags: ["test"]
draft: false
---

## UX

Use streaming. Tell the user what’s happening. Not just stream responses but
also tool calls and responses from the tool calls. Show the used documents to
synthesize the responses. It's much better than staring for 30 seconds at a
blank screen wondering, "Is this thing even working?". Amazon found that
[every 100ms of latency cost them 1% in sales](https://www.digitalrealty.com/resources/articles/the-cost-of-latency).
Forcing your users to wait will cause over 90% churn.

## Embeddings Generation

### Understand your data

Before you go into fine-tuning or any functional improvements, understand your
data by going into the trenches. Open your database IDE or do a dump of your
source material and chunks; you’ll be amazed at what you’re going to discover.
Empty chunks, meaningless data, dragons. Data cleaning is an essential part of
RAG design. Create your ingestion pipelines accordingly, remembering that
[garbage in, garbage out](https://en.wikipedia.org/wiki/Garbage_in_garbage_out).

### Chunking

Play with chunking methods and chunk sizes. The first naive thing you can do is
to make an embedding of, for example, a whole document. But the vector of `1536`
or `3072` dimensions (in the case of OpenAI models) is not going to capture the
whole semantic meaning of it. You need to divide it into pieces first. If you
don’t do this, you’ll lose some of the precious context.

But how? If you’re dealing with classical text data like OCRed PDFs, try
recursive chunking. It’s better than the most naive fixed-size chunking but with
respect for the document's structure. If your source is a bit richer, you can
use a document format-specific chunker. For example, for Markdown, you can use
[MarkdownTextSplitter](https://python.langchain.com/v0.1/docs/modules/data_connection/document_transformers/markdown_header_metadata/).
Even if you dislike Langchain (like I do), you can still import some of their
utility functions; they can be really helpful.

If you’re using OpenAI’s `text-embedding-ada-002` model, the recommended chunk
size is around 300 to 500 tokens, which translates to approximately 500-1000
characters depending on the type of text. If you’ve already migrated your system
to `text-embedding-3-large`, double that.

### Mix small and large chunks

## Evals

If you’ve implemented some of the advice I’ve already laid out here, how do you
know you’re not making things even worse? Invest in a minimal set of evals - a
systematic process of assessing the performance, accuracy, and effectiveness of
your RAG. You can even start without adding more tooling to your setup. Leverage
existing testing frameworks like Jest in the following way:

```javascript
// Unit test-like eval
test("is giving correct answer", async () => {
	const resp = await generateResponse("What’s the name of the CEO?");
	expect(resp.retrievedChunks).toContain(CHUNK_ABOUT_CEO);
	expect(resp.content).toContain(CEO_NAME);
});
```

Then, you can move on to more sophisticated, end-to-end evals like:

```javascript
// Semantic similarity eval
test("factfulness eval", async () => {
	const resp = await generateResponse("what’s our strategy?");
	// Implementation of that is a task for the reader
	expect(resp.content).toBeSemanticallySimilarTo(OUR_STRATEGY_PLAYBOOK);
});

// Grounding eval with other LLM as a judge
test("grounding eval", async () => {
	const question = "What’s the name of the CEO?";
	const resp = await generateResponse(question);
	// Implementation of that is a task for the reader
	const isGrounded = await askLLM(
		"Is the answer to the question based on the following set of data?",
		question,
		response.content,
		response.retrievedChunks,
	);
	expect(isGrounded).toBeTrue();
});
```

These are so-called "offline" evals. Ran in development/CI, mostly based on
synthetic data, aka the questions you come up with. But reality has a surprising
amount of detail. You’ll be amazed at what kind of questions your users are
asking. That’s why you also need…

### Monitoring / Online Evals

What gets measured gets improved. Gather questions, use cases, and feedback to
AI-generated responses. It will help you understand the blind spots you
initially had when imagining the use cases and designing the RAG and its tools.
Moreover, constantly evaluate each AI’s answer against the same set of evals. Is
the answer grounded, is it related to our domain, is it following our brand’s
intended tone, etc.

## Injecting the Embeddings into the Context

### Ordering

In the majority of the tutorials, you’ll see something like:

```sql
ORDER BY embedding <-> '[3,1,2]' LIMIT 5;
```

While this is perfectly fine for flat, contextless, equal documents, it might
not be the best thing for your use case. Chances are that there are factors more
important than just semantic similarities - freshness of the data (time decay
factor), total contract value of the document, popularity of an artist, etc. If
that’s the case, take these values also into account when ordering the chunks
and selecting what goes into the context. Example SQL query to achieve that:

```sql
SELECT
    *,
    -- Time decay factor with weight 0.5
    (0.5 * exp(-(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) +
    -- Cosine similarity with weight 1.0
     1.0 * (1 - (embedding <-> '[3,1,2]')) +
    -- Total contract value with weight 0.3
     0.3 * (metadata->>'total_contract_value')::numeric) AS score
FROM
    documents
ORDER BY
    score DESC
LIMIT 10;
```

### Include Metadata

Another pitfall I often see is not injecting metadata alongside the chunk’s
text. Things like parent document text, its creation date, or author name can
enrich the AI answers to be more relevant and point the user to the source
material.

### Formatting

After all, query results are just a text. It's important to format them in a way
that makes sense to the AI.

### Not just cosine similarity

When designing the function to query the vector store, allow the agent to also
supply more parameters than just the search query. Why? Querying just based term
isn’t going to give you desired results, for instance "biggest contracts
docusigned in Q3 2023 bigger than $75k" is likely going to fail to bring up the
relevant results. Put the agent in charge of sorting and allow the LLM to supply
custom filtering statements so the mentioned query will be transformed to a tool
call like:

```json
{
	"query": "docusigned by",
	"order_by": "total_order_value",
	"filter": {
		"AND": [
			{ "col": "created_at", "operator": "gte", "value": "2023-06-01" },
			{ "col": "created_at", "operator": "lte", "value": "2023-09-01" }
		]
	}
}
```
