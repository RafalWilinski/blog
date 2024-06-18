---
title: "Make Your RAG Suck Less"
description: "Common pitfalls in designing and implementing RAGs and how to fix them"
publishDate: "11 June 2024"
tags: ["rag", "llm", "ai", "embeddings"]
draft: false
image: https://rwilinski.ai/og-image/make-your-rag-suck-less.png
---

With the recent explosion in large language model (LLM) adoption, many implementations are falling short. This article tackles common issues and offers practical tips to improve Retrieval-Augmented Generation (RAG) systems, ensuring they perform better and deliver more accurate results.

## Embeddings Generation

Before you go into fine-tuning & trying different models, ensure that you have explored and addressed the low-hanging fruit.

### Understand Your Data

The quality of your data is going to affect the quality of your AI product. If your data is going to be shitty, no model or fine-tuning process will help you. Understand your
data by going into the trenches. Open your database IDE or do a dump of your
source material and chunks; you'll be amazed at what you're going to discover.
Empty chunks, chunks made of just a couple of letters, meaningless chunks made of only punctuation marks, dragons.

RAG is just yet another data challenge, and data cleaning is an essential part of it. Create your ingestion pipelines accordingly, remembering that
[garbage in, garbage out](https://en.wikipedia.org/wiki/Garbage_in_garbage_out).

### Chunking

Play with chunking methods and chunk sizes. The first naive thing you can do is
to make an embedding of, for example, a whole document. But the vector of `1536`
or `3072` dimensions (in the case of OpenAI models) is not going to capture the
whole semantic meaning of it and all the nuance inside. You need to divide it into pieces first. If you
don't do this, you'll lose some of the precious context.

But how? If you're dealing with classical text data like OCRed PDFs, try
[recursive chunking with overlaps](https://python.langchain.com/v0.1/docs/modules/data_connection/document_transformers/recursive_text_splitter/). It's better than the most naive fixed-size chunking but with
respect for the document's structure.

If your source is a bit richer, you can use a document format-specific chunker. For example, for Markdown, you can use [MarkdownTextSplitter](https://python.langchain.com/v0.1/docs/modules/data_connection/document_transformers/markdown_header_metadata/). Even if you dislike Langchain (like I do), you can still import some of their
[utility functions](https://python.langchain.com/v0.1/docs/modules/data_connection/document_transformers/); they can be really helpful.

Semantic chunking and agentic chunking are more advanced topics. Learn more about them in the great [5 Levels Of Text Splitting](https://github.com/FullStackRetrieval-com/RetrievalTutorials/blob/main/tutorials/LevelsOfTextSplitting/5_Levels_Of_Text_Splitting.ipynb) by [Greg Kamradt](https://x.com/GregKamradt).

### Mix Small and Large Chunks

If you're using OpenAI's `text-embedding-ada-002` model, the recommended chunk
size is around 300 to 500 tokens, which translates to approximately 500-1000
characters depending on the type of text. If you've already migrated your system
to `text-embedding-3-large`, double that.

To improve the robustness of your embeddings, you can also create much bigger chunks conveying the semantic meaning of the whole paragraph or whole sections of the document. It will give your system the ability to access high-level and low-level information about the document.

### Small-to-Big Retrieval

It might sound unintuitive, but you can decouple text chunks used for retrieval vs. the text chunks used for synthesis. Something that doesn't make sense as a vector might be an essential piece of data for the synthesis and the other way around - a piece of text that's not relevant for the synthesis might be a really good candidate for a vector.

I think the best example is pricing information. Consider the following source data:

```markdown
| Plan       | Monthly Subscription Fee | Annual Subscription Fee | User Capacity | Data Storage | API Requests  | Support Level             | Additional Charges (AC)                                       | Promotional Discounts          |
| ---------- | ------------------------ | ----------------------- | ------------- | ------------ | ------------- | ------------------------- | ------------------------------------------------------------- | ------------------------------ |
| Basic      | $19.99                   | $199.99                 | 1-10          | 10GB         | 1,000/month   | Email Support             | $0.10/extra GB, $0.05/additional AR                           | 10% off for first 3 months     |
| Standard   | $49.99                   | $499.99                 | 11-50         | 50GB         | 10,000/month  | Priority Email Support    | $0.08/extra GB, $0.04/additional AR                           | 15% off ASF if paid quarterly  |
| Enterprise | $249.99                  | $2,499.99               | 201-500       | 1TB          | 200,000/month | Dedicated Account Manager | $0.04/extra GB, $0.02/additional AR, $39.99 per user above UC | 25% off ASF for first 6 months |
```

An embedding of this whole table would result in a vector that has a very high noise-to-signal ratio because it has a lot of information. Instead of using the table contents as an input to the embedding function, you can use a summary of it instead. Something like: "pricing table for plans Basic, Standard, and Enterprise".

In code, it would look like this:

```typescript
const table = `| Plan       | Monthly Subscription Fee  ... <rest of the table> ...`;
const summary = "pricing table for plans Basic, Standard, and Enterprise";
const embedding = await openai.embeddings.create({
	model: "text-embedding-ada-002",
	input: summary,
});
await embeddingsTable.addRow({
	embedding: embedding.data[0].embedding,
	text: table,
});
```

## Evals

If you've implemented some of the advice I've already laid out here, how do you know you're not making things even worse? Invest in a minimal set of evals - a systematic process of assessing the performance, accuracy, and effectiveness of your RAG.

### Offline

Start with simple unit test-like assertions, even without adding more tooling to your setup. Leverage existing testing frameworks like Jest/Vitest in the following way:

```javascript
// Unit test-like eval
test("is giving correct answer", async () => {
	const resp = await generateResponse("What's the name of the CEO?");
	// aka "context recall"
	expect(resp.retrievedChunks).toContain(CHUNK_ABOUT_CEO);
	expect(resp.content).toContain(CEO_NAME);
});
```

// Then, you can move on to more sophisticated, end-to-end evals like factfulness:

```javascript
// Semantic similarity E2E eval
test("correctness", async () => {
	const resp = await generateResponse("what's our strategy?");
	// Implementation of that is a task for the reader
	expect(resp.content).toBeSemanticallySimilarTo(OUR_STRATEGY_PLAYBOOK);
});
```

// And grounding based on the source material:

```javascript
// Faithfulness measured using LLM-as-a-judge
test("grounding eval", async () => {
	const question = "What's the name of the CEO?";
	const resp = await generateResponse(question);
	const isGrounded = await askLLM(
		"Is the answer to the question based on the following set of data?",
		question,
		response.content,
		response.retrievedChunks,
	);
	expect(isGrounded).toBeTrue();
});
```

Once your test set grows and you move to more sophisticated evals like precision (if ground-truth relevant items are present and ranked high), recall (how many of the sentences are based on the context), correctness & relevancy (number of sentences in the context relevant to the question), consider using dedicated framework like [Ragas](https://docs.ragas.io) or [autoevals](https://github.com/braintrustdata/autoevals).

These are so-called "offline" evals. They should be run in development/CI whenever you're making a change to your system or the prompts. But, reality has a surprising amount of detail. You'll be amazed at what kind of questions your users are asking. That's why you also need...

### Monitoring & Online Evals

What gets measured gets improved. Gather questions, use cases, and feedback to AI-generated responses. It will help you understand the blind spots you initially had when imagining the use cases and designing the RAG and its tools.

Moreover, constantly evaluate each AI's answer against the same set of evals. Is the answer grounded, is it related to our domain, is it following our brand's intended tone, etc.

There are really good existing solutions for that on the market including [Humanloop](https://humanloop.com) or [LangSmith](https://langsmith.com). They will help you not only in monitoring the performance of your RAG but also in building the datasets for the offline evals.

### Human-in-the-Loop

All evals created up to this point are put in place by you and your presumptions. Feedback provided by your users can also be lazy, noisy, and lacking. If the system you're creating isn't connected to your domain, you might not be able to provide the right answers. LLM-as-a-judge can also be imperfect and lacking necessary context. To fix that, request or allocate a human with related domain knowledge to constantly review the AI's answers and provide feedback. Human oversight can provide critical corrections and insights, especially in complex or ambiguous cases. For instance, in medical AI applications, experts can review and refine model suggestions, ensuring higher accuracy and trustworthiness. This collaborative approach enhances overall performance.

## Retrieval

Very often the accuracy of answers can be improved just by raising the `topK` value of the fetched chunks from the vector store. But that's not always enough.

### Ordering

In the majority of the tutorials, you'll see something like:

```sql
ORDER BY embedding <-> '[3,1,2]' LIMIT 5;
```

While this is perfectly fine for flat, contextless, equal documents, it might
not be the best thing for your use case. Chances are that there are factors more
important than just semantic similarities:

- recency of the data
- user feedback
- total contract value
- popularity of an artist or document

_etc._

If that's the case, you should also take these values into account when ordering the chunks
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

This query will not only rank the documents by their semantic similarity but also by the time decay factor and total contract value.

### Cosine Similarity Isn't Enough

When designing the function/tool to query the vector store, allow the agent to also
supply more parameters than just the search query.

Why? Querying just based on a term isn't going to give you the desired results. For instance, "biggest contracts
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

### Hybrid Search

If the data/system you're building on top of already has a full-text search capability (e.g. in Postgres `WHERE to_tsvector(text) @@ to_tsquery('some query');`), you can also use that to improve the results. Perform searches both in the vector store and in the full-text search engine in parallel and combine them afterward. This approach leverages the strengths of both methods, ensuring comprehensive and precise results - while full-text search will give you coverage in the most obvious cases, the vector store will take care of synonyms and other details that are hard to capture in the text search.

### Include Metadata

Another pitfall I often see is not injecting metadata alongside the chunk's text. Things like parent document text, its creation date, link, or author name can enrich the AI answers to be more relevant and point the user to the source material. For example, in a legal document retrieval system, metadata like case number, court, and jurisdiction can be crucial.

## UX

Use streaming. Tell the user what's happening. It's much better than staring for 30 seconds at a
blank screen wondering, "Is this thing even working?". If Amazon found that
[every 100ms of latency cost them 1% in sales](https://www.digitalrealty.com/resources/articles/the-cost-of-latency). then forcing your users to wait over 10 seconds for something to show up will cause massive churn for sure.

Stream not just responses but also tool calls and responses from them. Since RAG stands for "Retrieval Augmented Generation", it's important to show the documents used to synthesize the responses or links to the source material. It will even help you understand the reasoning behind the answers and identify blind spots in your data.
