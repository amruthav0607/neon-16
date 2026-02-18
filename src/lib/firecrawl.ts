import Firecrawl from 'firecrawl';

const apiKey = process.env.FIRECRAWL_API_KEY;

// Initialize Firecrawl only if key is present
const app = apiKey ? new Firecrawl({ apiKey }) : null;

export type WebSearchResult = {
    title: string;
    url: string;
    content: string;
};

export async function searchWeb(query: string, limit = 3): Promise<WebSearchResult[]> {
    if (!app) {
        console.warn("Firecrawl API key missing. Web search skipped.");
        return []; // Fallback gracefully
    }

    try {
        console.log(`Searching web for: ${query}`);

        // Use 'any' to bypass potential type mismatches between local and CI environments
        const searchResponse: any = await app.search(query, {
            limit: limit,
            scrapeOptions: {
                formats: ['markdown']
            }
        });

        if (!searchResponse || !searchResponse.web) {
            return [];
        }

        return searchResponse.web.map((item: any) => ({
            title: item.title || item.url,
            url: item.url,
            content: item.markdown || item.content || item.description || ""
        }));

    } catch (error) {
        console.error("Firecrawl search error:", error);
        return [];
    }
}
