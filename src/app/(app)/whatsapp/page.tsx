import { requireTab } from "@/lib/guards";
import WhatsappClient from "./whatsapp-client";

export default async function WhatsappPage() {
  await requireTab("whatsapp");
  return <WhatsappClient />;
}
