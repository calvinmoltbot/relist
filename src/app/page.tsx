import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  Package,
  Percent,
  Clock,
} from "lucide-react";

const stats = [
  {
    title: "Revenue this month",
    value: "--",
    icon: DollarSign,
  },
  {
    title: "Items sold",
    value: "--",
    icon: Package,
  },
  {
    title: "Profit margin",
    value: "--",
    icon: Percent,
  },
  {
    title: "Effective hourly rate",
    value: "--",
    icon: Clock,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Good morning
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Here&apos;s an overview of your reselling business.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="size-10 text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">
            Start by adding inventory to track your business
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
