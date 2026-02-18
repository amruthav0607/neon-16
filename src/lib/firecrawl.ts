import FirecrawlApp from 'firecrawl';

const apiKey = process.env.FIRECRAWL_API_KEY;

// Initialize Firecrawl only if key is present
const app = apiKey ? new FirecrawlApp({ apiKey }) : null;

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
        // Requires Firecrawl "search" method support
        // Note: Check Firecrawl SDK docs. Assuming app.search or app.crawl
        // The user prompt implies "Send query to Firecrawl search -> crawl top results"
        // Firecrawl /search endpoint usually returns results. 

        const searchResponse = await app.search(query, {
            pageOptions: {
                fetchPageContent: true // Get content directly
            },
            searchOptions: {
                limit: limit
            }
        });

        if (!searchResponse || !searchResponse.data) {
            return [];
        }

        return searchResponse.data.map((item: any) => ({
            title: item.metadata?.title || item.url,
            url: item.url,
            content: item.markdown || item.content || ""
        }));

    } catch (error) {
        console.error("Firecrawl search error:", error);
        return [];
    }
}
