import { applicationRouteRegistry, type ApplicationRouteDefinition } from "./routeRegistry";

// "/platform/companies/[companyId]" -> /^\/platform\/companies\/([^/]+)\/?$/
function patternToRegularExpression(pathPattern: string): RegExp {
  const escapedSegments = pathPattern
    .split("/")
    .map((segment) => (/^\[[^\]]+\]$/.test(segment) ? "([^/]+)" : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  return new RegExp(`^${escapedSegments.join("/")}/?$`);
}

function countStaticSegments(pathPattern: string): number {
  return pathPattern.split("/").filter((segment) => segment.length > 0 && !/^\[[^\]]+\]$/.test(segment)).length;
}

type CompiledRoute = { definition: ApplicationRouteDefinition; expression: RegExp; staticSegmentCount: number };

function compileRegistry(registry: readonly ApplicationRouteDefinition[]): CompiledRoute[] {
  return registry
    .map((definition) => ({
      definition,
      expression: patternToRegularExpression(definition.pathPattern),
      staticSegmentCount: countStaticSegments(definition.pathPattern),
    }))
    // the most specific pattern wins: /platform/directory before /platform/[anything]
    .sort((left, right) => right.staticSegmentCount - left.staticSegmentCount);
}

const compiledApplicationRegistry = compileRegistry(applicationRouteRegistry);

// Finds the registry entry for a browser path. Returns undefined when the path is not registered, which the
// guards treat as "deny" (deny by default).
export function resolveRouteDefinition(
  pathname: string,
  registry?: readonly ApplicationRouteDefinition[],
): ApplicationRouteDefinition | undefined {
  const compiled = registry ? compileRegistry(registry) : compiledApplicationRegistry;
  const pathWithoutQuery = pathname.split("?")[0].split("#")[0];
  return compiled.find((route) => route.expression.test(pathWithoutQuery))?.definition;
}
