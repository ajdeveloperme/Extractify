import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: number;
  color?: string;
}

const StatsCard = ({ label, value, color = "text-primary" }: StatsCardProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <p className={`text-4xl font-bold ${color}`}>{value}</p>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
