import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const UNLOCKED_FEATURES = [
  "Custom application branding and app icon customization",
  "Unlimited user accounts with delegated access",
  "Shared inboxes and mailboxes",
  "Account-level and domain-level email forwarding",
  "Full API, Webhook, and JMAP access",
  "Custom domain routing rules and storage rules",
];

export default function LicensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium text-neutral-900">License & Editions</h1>
        <p className="mt-2 text-sm text-neutral-500">
          All features and capabilities are fully unlocked for this installation.
        </p>
      </div>

      <Card className="rounded-3xl border-0 bg-white p-6">
        <CardHeader className="py-0">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 text-sm font-medium px-3 py-1">
              Team Edition · Active
            </Badge>
          </div>
          <div className="pt-3">
            <CardTitle className="text-2xl">Full Features Unlocked</CardTitle>
            <CardDescription className="mt-1">
              This installation has complete access to all Mailflare features without requiring any external license keys.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {UNLOCKED_FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5 text-sm text-neutral-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
