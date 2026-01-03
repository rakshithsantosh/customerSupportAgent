import { StateGraph } from "@langchain/langgraph";
import { StateAnnotation } from "./state";
import { model } from "./model";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getOffers } from "./tools";

const marketingtools = [getOffers];
const marketingtoolNode = new ToolNode(marketingtools);

async function frontDeskSupport(state: typeof StateAnnotation.State) {
  //logic for frontdesk support
  const SYSTEM_PROMPT = `You are a frontline support staff for a company that helps software developers excel in their careers through practical web development and GenAi projects. Be polite and professional in your responses.You can chat with users and help them with basic questions , but if the user is having a marketing or learning support query, do not try to answer the question directly or gather information. Instead , immediately transfer them to the marketing team(promo codes, discounts,offers, and special campaigns) or learning support team (course content, curriculum, assignments, projects, technical issues) respectively by asking the user to hold for a moment. Otherwise , help them with their queries related to general information about the company, course offerings, enrollment process, pricing, and payment options.`;

  const supportResponse = await model.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    ...state.messages,
  ]);

  const CATEGORIZATION_SYSTEM_PROMPT = `You are an expert at categorizing customer support queries. Given a customer support query, categorize it into one of the following categories: "marketing", "learning", or "general". If the query is related to promo codes, discounts, offers, or special campaigns, categorize it as "marketing". If the query is related to course content, curriculum, assignments, projects, or technical issues, categorize it as "learning". For all other queries, categorize them as "general". Respond with only the category name.`;

  const CATEGORIZATION_HUMAN_PROMPT = `The previous conversation is an interaction between a customer support representative and a user, Extract whether the representative is routing the user to a marketing team or learning support team , or whether they are just responding conversationally. Respond with a JSON object containing a single key called "nextRepresentative" with one of the following values:
  if they want to route the user to the marketing team, respond with "MARKETING" if they want ot route the user to the learning support team , respond with "LEARNING".Otherwise , respond only with the word "RESPOND"`;

  const categorizationResponse = await model.invoke(
    [
      { role: "system", content: CATEGORIZATION_SYSTEM_PROMPT },
      ...state.messages,
      { role: "user", content: CATEGORIZATION_HUMAN_PROMPT },
    ],
    { response_format: { type: "json_object" } }
  );

  const categorizationOutput = JSON.parse(
    categorizationResponse.content as string
  );

  return {
    messages: [supportResponse],
    nextRepresentative: categorizationOutput,
  };
}

async function marketingSupport(state: typeof StateAnnotation.State) {
  //logic for marketing support
  const llmwithTools = model.bindTools(marketingtools);

  const SYSTEM_PROMPT = `You are a marketing support representative for a company that helps software developers excel in their careers through practical web development and GenAi projects. Your job is to assist users with any marketing-related queries, including providing information about discounts, promo codes, offers, and special campaigns. Use the available tools to fetch the latest offers and discounts when necessary. Be polite and professional in your responses.`;

  const marketingResponse = llmwithTools.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    ...state.messages,
  ]);

  return { messages: [marketingResponse] };
}

function LearningSupport(state: typeof StateAnnotation.State) {
  //logic for learning support
  console;
  return state;
}

function whoIsNext(state: typeof StateAnnotation.State) {
  if (state.nextRepresentative.includes("MARKETING")) {
    return "marketingSupport";
  } else if (state.nextRepresentative.includes("LEARNING")) {
    return "LearningSupport";
  } else if (state.nextRepresentative.includes("RESPOND")) {
    return "__end__";
  } else {
    return "__end__";
  }
}

const graph = new StateGraph(StateAnnotation)
  .addNode("frontDeskSupport", frontDeskSupport)
  .addNode("marketingSupport", marketingSupport)
  .addNode("LearningSupport", LearningSupport)
  .addEdge("__start__", "frontDeskSupport")
  .addConditionalEdges("frontDeskSupport", whoIsNext, {
    marketingSupport: "marketingSupport",
    LearningSupport: "LearningSupport",
    __end__: "__end__",
  })
  .addEdge("marketingSupport", "__end__")
  .addEdge("LearningSupport", "__end__");

const app = graph.compile();

//invoke

async function main() {
  const stream = await app.stream({
    messages: [
      {
        role: "user",
        content:
          "Hi, I would like to know about any discounts available on your web development course.",
      },
    ],
  });

  for await (const value of stream) {
    console.log("----- New State Update -----");
    console.log(value);
    console.log("----------------------------");
  }
}

main();
