import { Candidate, Client } from './types';

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function calculateLevenshteinDistance(s1: string, s2: string): number {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[len1][len2];
}

/**
 * Calculates percentage similarity between two strings using Levenshtein distance.
 */
export function calculateSimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();
    if (str1 === str2) return 100;
    if (str1.length === 0 || str2.length === 0) return 0;

    const distance = calculateLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return ((maxLength - distance) / maxLength) * 100;
}

export type ConfidenceScore = 'High' | 'Medium' | 'Low';

export interface SearchResult {
    client: Client;
    confidence: ConfidenceScore;
    score: number;
}

/**
 * Performs a "Smart Search" on the clients array based on candidate details.
 */
export function performSmartSearch(candidate: Partial<Candidate>, clients: Client[]): SearchResult[] {
    const results: SearchResult[] = [];
    const SIMILARITY_THRESHOLD = 85;

    const candidateMobile = candidate.mobile?.trim();
    const candidateFirstName = candidate.firstName?.trim() || candidate.nickname?.trim() || '';
    const candidateLastName = candidate.lastName?.trim() || '';
    const candidateFullName = `${candidateFirstName} ${candidateLastName}`.trim();
    const candidateNeighborhoodId = candidate.referralSheetId ? null : (candidate as any).locationSelection?.neighborhoodId; // Handle both types

    for (const client of clients) {
        let confidence: ConfidenceScore | null = null;
        let score = 0;

        // 1. High Confidence: Exact match on Primary Mobile or any Contact number
        const clientContacts = client.contacts || [];
        const hasMobileMatch = (client.mobile?.trim() === candidateMobile) ||
            clientContacts.some(c => c.number?.trim() === candidateMobile);

        if (candidateMobile && hasMobileMatch) {
            confidence = 'High';
            score = 100;
        }

        // 2. Medium Confidence: Fuzzy match on Full Name
        if (!confidence && candidateFullName && client.name) {
            const similarity = calculateSimilarity(candidateFullName, client.name);
            if (similarity >= SIMILARITY_THRESHOLD) {
                confidence = 'Medium';
                score = similarity;
            }
        }

        // 3. Low Confidence: Fuzzy match on First Name + Exact match on City/Area (Neighborhood)
        if (!confidence && candidateFirstName && client.name && candidateNeighborhoodId) {
            const firstNameSimilarity = calculateSimilarity(candidateFirstName, client.name.split(' ')[0]);
            const neighborhoodMatch = String(client.neighborhood) === String(candidateNeighborhoodId);

            if (firstNameSimilarity >= SIMILARITY_THRESHOLD && neighborhoodMatch) {
                confidence = 'Low';
                score = firstNameSimilarity;
            }
        }

        if (confidence) {
            results.push({ client, confidence, score });
        }
    }

    // Sort by score and limit to 10
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
