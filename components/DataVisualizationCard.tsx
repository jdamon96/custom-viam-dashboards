import React, { Dispatch, SetStateAction, useEffect } from "react";
import useViamGetTabularDataByMQL from "@/hooks/useViamGetTabularDataByMQL";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import { MoreVertical } from "lucide-react";
import { DateRangePicker } from "./ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export interface DataCard {
  id: string;
  title: string;
  robotId: string;
  dataSource: string;
  storageKey: string; // has form  "DASHBOARD_CARDS_{ORG_ID}_{LOC_ID}", e.g. "DASHBOARD_CARDS_85a3a4fc-f195-4d88-9ccd-26dc10f7755b_yiuf04fb9s"
  aggregationStages: any[];
  visualizationType: string;
  dateRange?: DateRange; // Add dateRange to DataCard interface
}

export const constructMqlQueryStagesForDataVisualizationCard = (
  orgId: string,
  locId: string,
  robotId?: string,
  date?: DateRange,
  dataSource?: string,
  visualizationType?: string
) => {
  const startTime = date?.from
    ? date.from.toISOString()
    : new Date(0).toISOString();
  const endTime = date?.to ? date.to.toISOString() : new Date().toISOString();

  const matchStage: any = {
    organization_id: orgId, // "5e3a2211-d311-4685-b595-e53b894c3719",
    location_id: locId, // "yiuf04fb9s",
    $expr: {
      $and: [
        {
          $gte: ["$time_received", { $toDate: startTime }],
        },
        {
          $lte: ["$time_received", { $toDate: endTime }],
        },
      ],
    },
  };

  if (robotId) {
    matchStage.robot_id = robotId; // "d4e8acde-d1b9-4ed6-b9aa-229db1211d78"
  }

  if (dataSource) {
    matchStage.component_name = dataSource;
  }

  return [
    {
      $match: matchStage,
    },
    { $limit: 100 },
  ];
};

const DataVisualizationCard: React.FC<{
  card: DataCard;
  orgId: string;
  locId: string;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (card: DataCard) => void; // Add onSave prop
}> = ({ card, orgId, locId, onEdit, onDelete, onSave }) => {
  const [date, setDate] = React.useState<DateRange | undefined>(
    card.dateRange ?? {
      from: addDays(new Date(), -7),
      to: new Date(),
    }
  );
  const { fetchTabularData, loading, error, data } =
    useViamGetTabularDataByMQL();

  useEffect(() => {
    const mqlStages = constructMqlQueryStagesForDataVisualizationCard(
      orgId,
      locId,
      card.robotId,
      date,
      card.dataSource,
      card.visualizationType
    );
    if (orgId) {
      fetchTabularData(orgId, mqlStages).then(() => {
        console.log("Data fetched successfully!");
      });
    }
  }, [
    orgId,
    locId,
    card.robotId,
    card.dataSource,
    card.visualizationType,
    fetchTabularData,
    date, // Add date to dependency array
  ]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate as DateRange | undefined);
    onSave({ ...card, dateRange: newDate });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <div className="flex items-center space-x-2">
          <DateRangePicker
            date={date}
            setDate={(date) => handleDateChange(date as DateRange | undefined)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{card.title}</div>
        <div className="">{JSON.stringify(data, null, 2)}</div>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          {card.dataSource} - {card.visualizationType}
        </div>
      </CardFooter>
    </Card>
  );
};

export default DataVisualizationCard;
