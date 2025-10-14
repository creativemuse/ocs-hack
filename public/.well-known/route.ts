import { minikitConfig } from "../../minikit.config";
import { withValidManifest } from "@coinbase/onchainkit/minikit";
    
export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL as string;
  return Response.json(withValidManifest(minikitConfig));
}