import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DeepSearchClient from "./DeepSearchClient";

export default async function DeepSearchPage() {
    const session = await auth();

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    return <DeepSearchClient />;
}
