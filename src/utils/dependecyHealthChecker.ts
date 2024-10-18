import { DependencyAnalyzer } from "./dependecyAnalyzer";

// src/services/dependencyHealthChecker.ts
export class DependencyHealthChecker {
    static async checkDependencyHealth(): Promise<string[]> {
        const dependencies = await DependencyAnalyzer.getDependenciesFromPubspec();
        return DependencyAnalyzer.analyzeDependencyHealth(dependencies);
    }
}
