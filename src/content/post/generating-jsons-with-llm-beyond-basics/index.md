---
title: Generating JSONs with LLMs - Beyond Basics
description: Advanced techniques for improving speed, accuracy and cost of JSON generation with LLMs.
publishDate: "22 August 2024"
tags: ["llm", "ai", "json"]
draft: true
---

Turning unstructured data into structured data is one of the core use cases for AI. In the OpenAI APIs world, the three most popular methods are:

- **JSON mode** - Instructing an LLM to output JSON. Instructions regarding the shape of the JSON must included in the prompt. This is also available in [Mistral models](https://docs.mistral.ai/capabilities/json_mode/).
- **Tool calling** - Instructing an LLM to call a tool that follows a certain JSONSchema. This functionality is also available in Anthropic's Claude models family.
- **Structured Outputs** - Evolution of JSON Mode with strict schema adherance.

You can learn more about their strengths and weaknesses in my [previous blogpost about benchmarking Strict Mode](/posts/benchmarking-llms-for-structured-json-generation/).

## Increasing Accuracy

### Enriching the Schema

- Provide `descriptions` for each field. Think of them as mini prompts for each field.
- Provide `reasoning` for fields that require computings, decision making or computing a value based on other fields. Think of it as mini ["Chain of Thought"](https://www.promptingguide.ai/techniques/cot) approach for each field. [Studies have shown](https://arxiv.org/abs/2201.11903) that providing reasoning can improve the accuracy of the output.
- Not all JSONSchema are supported by the strict mode! Solution to this is: create as detailed schema as possible. Pass dumbed down version of the schema with only supported properties to the LLM. Validate the output against the full schema using e.g. Zod. Get the validation errors and pass them to the LLM along with the output and ask it to fix the errors.

**Cost:** Increased input tokens usage

### Fields Sequencing

In traditional computing, the order of fields in JSON does not matter but in LLM it does. Try to put them in as logical order as possible. For instance, when extracting data from invoice, bad order can be something like `"signed_by, invoice number, total, due date"` etc. If you were a human reading this invoice in that order, you would be very confused. LLM will have exactly the same trouble.

**Cost:** Free

### Multipass mode & election

OpenAI API supports the `n` parameter, which allows for generating multiple completions in one request. This can be used to generate multiple JSONs in a single request and pay for the input just once (you will still be billed a multiple of `n` for the output tokens). This combined with bigger `temperature` which increases models creativity, can be used to ensemble a "mixture of results" approach.

Once you have multiple JSONs, for each field you can elect to take the most frequent value by using majority voting to decide on the value.

![Election of the most frequent value](./election.png "Election of the most frequent value")

In models from other providers where you cannot use `n` parameter, you can still use the same approach by generating multiple completions. Keep in mind that the cost of such operation would be a multipled for both input and output tokens.

**Cost:** In OpenAI - multiplied output tokens usage. For other providers, multiplied output _and_ input tokens usage.

## Increasing Speed

A trick commonly used in traditional computing is to use parallel processing to speed up the operation. This can be also used in LLM world. Split your schema into multiple independent schemas and generate multiple JSONs in parallel. Merge them afterwards.

Example code in Typescript using `ai` library:

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Define the subschemas
const subSchemaOne = z.object({
	name: z.string(),
});
const subSchemaTwo = z.object({
	age: z.number(),
});

// Generate multiple JSONs in parallel
const responses = await Promise.all(
	[subSchemaOne, subSchemaTwo].map((subschema) => {
		const { object } = generateObject(subschema, {
			model: openai("gpt-4o"),
			schema: subschema,
			prompt: "John is 25 years old. What's his name or age?",
		});

		return object;
	}),
);

// Merge the responses into a single JSON object
const merged = responses.reduce((acc, curr) => ({ ...acc, ...curr }), {});
```

Be careful though. As I mentioned before, sequence of fields and their co-presence does matter in LLM world. Make sure that your groups are independent logically and that they don't have any dependencies on each other. In practical example - if you have an invoice, you can split it into following independent subschemas: `Recipient`, `Sender`, `Items`.

**Cost:** Multiplied input tokens usage.

## Reducing Costs
