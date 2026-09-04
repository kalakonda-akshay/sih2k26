/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiContext from "../aiContext.js";
import type * as alerts from "../alerts.js";
import type * as analytics from "../analytics.js";
import type * as assistant from "../assistant.js";
import type * as briefing from "../briefing.js";
import type * as dashboard from "../dashboard.js";
import type * as deliveries from "../deliveries.js";
import type * as demo from "../demo.js";
import type * as fleet from "../fleet.js";
import type * as incidents from "../incidents.js";
import type * as insights from "../insights.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_intents from "../lib/intents.js";
import type * as lib_riskCalculations from "../lib/riskCalculations.js";
import type * as lib_routeGraph from "../lib/routeGraph.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_vehicleRisk from "../lib/vehicleRisk.js";
import type * as map from "../map.js";
import type * as riskEngine from "../riskEngine.js";
import type * as riskPredictions from "../riskPredictions.js";
import type * as roads from "../roads.js";
import type * as routeIntelligence from "../routeIntelligence.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiContext: typeof aiContext;
  alerts: typeof alerts;
  analytics: typeof analytics;
  assistant: typeof assistant;
  briefing: typeof briefing;
  dashboard: typeof dashboard;
  deliveries: typeof deliveries;
  demo: typeof demo;
  fleet: typeof fleet;
  incidents: typeof incidents;
  insights: typeof insights;
  "lib/analytics": typeof lib_analytics;
  "lib/constants": typeof lib_constants;
  "lib/helpers": typeof lib_helpers;
  "lib/intents": typeof lib_intents;
  "lib/riskCalculations": typeof lib_riskCalculations;
  "lib/routeGraph": typeof lib_routeGraph;
  "lib/validators": typeof lib_validators;
  "lib/vehicleRisk": typeof lib_vehicleRisk;
  map: typeof map;
  riskEngine: typeof riskEngine;
  riskPredictions: typeof riskPredictions;
  roads: typeof roads;
  routeIntelligence: typeof routeIntelligence;
  routes: typeof routes;
  seed: typeof seed;
  users: typeof users;
  vehicles: typeof vehicles;
  weather: typeof weather;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
