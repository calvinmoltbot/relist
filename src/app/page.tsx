import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Repeat, TrendingUp, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <Badge variant="secondary" className="text-sm">
          Beta
        </Badge>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          ReList
        </h1>

        <p className="max-w-md text-lg text-muted-foreground">
          Smart tools for Vinted resellers. Track listings, automate relisting,
          and grow your shop.
        </p>

        <div className="flex gap-3">
          <Button size="lg">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline">
            Learn More
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Feature
            icon={<Repeat className="h-5 w-5" />}
            title="Auto Relist"
            description="Automatically relist expired items to keep your shop fresh."
          />
          <Feature
            icon={<TrendingUp className="h-5 w-5" />}
            title="Analytics"
            description="Track views, favourites, and sales across all your listings."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Bulk Actions"
            description="Edit prices, descriptions, and photos in bulk."
          />
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
