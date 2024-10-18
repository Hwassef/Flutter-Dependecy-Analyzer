import { DependencyAnalyzer } from "./dependecyAnalyzer";
export class DependencyHealthChecker {
    static async checkDependencyHealth(): Promise<string[]> {
        const dependencies = await DependencyAnalyzer.getDependenciesFromPubspec();
        return DependencyAnalyzer.analyzeDependencyHealth(dependencies);
    }
}
