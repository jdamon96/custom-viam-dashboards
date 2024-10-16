// components/DataVisualizationCardConfigurationForm.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { constructInitialMatchStageBasedOnCardConfigurationForm } from "./DataVisualizationCard";
import useGetViamRobotParts from "@/hooks/useGetViamRobotParts";
import { Robot } from "@/hooks/useListViamRobots";
import { cn, parseComponentsWithDataManager } from "@/lib/utils";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import {
  ArrowRight,
  Braces,
  Check,
  ChevronsUpDown,
  Wrench,
} from "lucide-react";
import useAppStore, { DataCard } from "@/store/zustand";
import useViamGetTabularDataByMQL from "@/hooks/useViamGetTabularDataByMQL";
import QueryBuilder from "./QueryBuilder";
import { Input } from "./ui/input";
import { AggregationStage } from "@/types/AggregationStage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import { Badge } from "./ui/badge";
import SearchableMultiSelect from "@/components/SearchableMultiSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import JsonCodeEditor from "./JsonEditor";

const visualizationTypes = ["Stacked Bar Chart", "Line Chart", "Table"];

interface DataVisualizationCardConfigurationFormProps {
  card: DataCard;
  onSave: (card: DataCard) => void;
  locationMachines: Robot[];
  onModeChange: (isQueryBuilder: boolean) => void;
}

const DataVisualizationCardConfigurationForm: React.FC<
  DataVisualizationCardConfigurationFormProps
> = ({ card, onSave, locationMachines, onModeChange }) => {
  // State Management
  const [title, setTitle] = useState(card.title);
  const [dataSource, setDataSource] = useState(card.dataSource);
  const [dataSourceRobotId, setDataSourceRobotId] = useState(
    card.robotId || ""
  );
  const [machineSource, setMachineSource] = useState<Robot | undefined>(
    locationMachines.find((machine) => machine.id === card?.robotId)
  );
  const [dataCollectingComponents, setDataCollectingComponents] =
    useState<any>();
  const [visualizationType, setVisualizationType] = useState(
    card.visualizationType
  );
  const [isQueryBuilder, setIsQueryBuilder] = useState(false);

  // **Initial Tab Selection Based on Configured Machines**
  const initialActiveTab = useMemo<"singleMachine" | "groupOfMachines">(() => {
    return card.groupMachines && card.groupMachines.length > 0
      ? "groupOfMachines"
      : "singleMachine";
  }, [card.groupMachines]);

  const [activeTab, setActiveTab] = useState<
    "singleMachine" | "groupOfMachines"
  >(initialActiveTab);

  const toggleQueryBuilder = useCallback(
    (value: boolean) => {
      setIsQueryBuilder(value);
      onModeChange(value); // Notify parent
    },
    [onModeChange]
  );

  const [stages, setStages] = useState<AggregationStage[]>(
    card.aggregationStages ?? []
  );
  const { currentlySelectedLocation, currentlySelectedOrganization } =
    useAppStore();

  const { fetchRobotParts, robotParts } = useGetViamRobotParts();

  const { fetchTabularData, loading, error, data } =
    useViamGetTabularDataByMQL();

  // **State for Group of Machines**
  const [selectedGroupMachines, setSelectedGroupMachines] = useState<string[]>(
    card.groupMachines || []
  );
  const [selectedGroupFragment, setSelectedGroupFragment] = useState<
    string | null
  >(card.groupFragment || null);

  // Memoize machines options to prevent unnecessary recalculations
  const machinesOptions = useMemo(
    () =>
      locationMachines.map((machine) => ({
        value: machine.id,
        label: machine.name,
      })),
    [locationMachines]
  );

  // Memoize fragments to prevent unnecessary recalculations
  const fragments = useMemo(
    () => [
      {
        value: "fragment1",
        label: "Fragment 1",
        machines: [
          "a5b306ea-1d01-4c61-9650-04a077c67a92",
          "d4e8acde-d1b9-4ed6-b9aa-229db1211d78",
        ],
      },
      {
        value: "fragment2",
        label: "Fragment 2",
        machines: [
          "19cb3cb8-ac17-4b34-9629-18597c95ae98",
          "another-machine-id",
        ],
      },
      {
        value: "fragment3",
        label: "Fragment 3",
        machines: ["some-other-machine-id"],
      },
    ],
    []
  );

  // Fetch Robot Parts when machineSource changes
  useEffect(() => {
    if (machineSource?.id) {
      fetchRobotParts(machineSource.id);
    }
  }, [machineSource, fetchRobotParts]);

  // Parse components when robotParts changes
  useEffect(() => {
    if (robotParts) {
      const components = parseComponentsWithDataManager(robotParts);
      setDataCollectingComponents(components);
    }
  }, [robotParts]);

  /**
   * Construct and update agg pipeline initial $match stage whenever relevant form fields change.
   */
  useEffect(() => {
    if (
      !currentlySelectedLocation ||
      !currentlySelectedOrganization ||
      !dataSourceRobotId
    )
      return;

    const updatedInitMatchStage =
      constructInitialMatchStageBasedOnCardConfigurationForm(
        currentlySelectedOrganization.id,
        currentlySelectedLocation.id,
        dataSourceRobotId,
        card.dateRange,
        dataSource
      );
    setStages((prevStages) => [updatedInitMatchStage, ...prevStages.slice(1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dataSource,
    dataSourceRobotId,
    visualizationType,
    currentlySelectedLocation,
    currentlySelectedOrganization,
    card.dateRange,
  ]);

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const updatedCard: DataCard = {
        ...card,
        title,
        visualizationType,
        aggregationStages: stages,
      };

      if (activeTab === "singleMachine") {
        updatedCard.dataSource = dataSource;
        updatedCard.robotId = machineSource?.id || "";
        updatedCard.groupMachines = []; // Clear groupMachines
        updatedCard.groupFragment = null; // Clear groupFragment
      } else if (activeTab === "groupOfMachines") {
        updatedCard.groupMachines = selectedGroupMachines;
        updatedCard.groupFragment = selectedGroupFragment;
        updatedCard.robotId = ""; // Clear robotId if group is selected
        updatedCard.dataSource = ""; // Clear dataSource
      }

      onSave(updatedCard);
    },
    [
      card,
      title,
      visualizationType,
      stages,
      activeTab,
      dataSource,
      machineSource,
      selectedGroupMachines,
      selectedGroupFragment,
      onSave,
    ]
  );

  // Handlers for GroupOfMachinesSelectionForm
  const handleMachinesSelected = useCallback((selectedMachines: string[]) => {
    setSelectedGroupMachines(selectedMachines);
  }, []);

  const handleFragmentSelected = useCallback(
    (selectedFragment: string | null) => {
      setSelectedGroupFragment(selectedFragment);
    },
    []
  );

  return (
    <>
      {isQueryBuilder ? (
        <QueryBuilder
          stages={stages}
          setStages={setStages}
          onClose={() => toggleQueryBuilder(false)}
        />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="p-4 flex flex-col space-y-6 min-w-[410px] overflow-auto"
        >
          {/* Card Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Card Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Visualization Type */}
          <div className="space-y-2">
            <Label htmlFor="visualizationType">Visualization Type</Label>
            <Select
              value={visualizationType}
              onValueChange={setVisualizationType}
              required
            >
              <SelectTrigger id="visualizationType">
                <SelectValue placeholder="Select a visualization type" />
              </SelectTrigger>
              <SelectContent>
                {visualizationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Label>Data Source</Label>
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "singleMachine" | "groupOfMachines")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="singleMachine">Single Machine</TabsTrigger>
              <TabsTrigger value="groupOfMachines">
                Group of Machines
              </TabsTrigger>
            </TabsList>
            <TabsContent value="singleMachine">
              <ConfigurationForm
                title={title}
                setTitle={setTitle}
                dataSource={dataSource}
                setDataSource={setDataSource}
                machineSource={machineSource}
                setMachineSource={setMachineSource}
                setDataSourceRobotId={setDataSourceRobotId}
                locationMachines={locationMachines}
                dataCollectingComponents={dataCollectingComponents}
                stages={stages}
                toggleQueryBuilder={toggleQueryBuilder}
              />
            </TabsContent>
            <TabsContent value="groupOfMachines">
              <GroupOfMachinesSelectionForm
                locationMachines={locationMachines}
                selectedGroupMachinesIds={selectedGroupMachines}
                onMachinesSelected={handleMachinesSelected}
                onFragmentSelected={handleFragmentSelected}
                fragments={fragments}
              />
            </TabsContent>
          </Tabs>

          {/* Data Aggregation Pipeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Data Aggregation Pipeline</Label>
              <Button
                variant={"ghost"}
                onClick={() => toggleQueryBuilder(true)}
                className="text-xs border border-gray-300 hover:bg-gray-100 hover:cursor-pointer rounded px-3 py-1 flex items-center space-x-1"
              >
                <Wrench size={12} className="text-gray-700" />
                <span>Configure</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto py-2">
              {stages.map((stage, index) => (
                <React.Fragment key={index}>
                  <StageBlock
                    stage={stage}
                    onClick={() => toggleQueryBuilder(true)}
                  />
                  {index < stages.length - 1 && (
                    <ArrowRight className="text-gray-400" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Save Configuration Button */}
          <Button type="submit">Save Configuration</Button>
        </form>
      )}
    </>
  );
};

export default DataVisualizationCardConfigurationForm;

/**
 * ConfigurationForm Component
 * Refactored <form /> and its contents into a separate functional component for better readability.
 */

interface ConfigurationFormProps {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  dataSource: string;
  setDataSource: React.Dispatch<React.SetStateAction<string>>;
  machineSource: Robot | undefined;
  setMachineSource: React.Dispatch<React.SetStateAction<Robot | undefined>>;
  setDataSourceRobotId: React.Dispatch<React.SetStateAction<string>>;
  locationMachines: Robot[];
  dataCollectingComponents: any;
  stages: AggregationStage[];
  toggleQueryBuilder: (value: boolean) => void;
}

const ConfigurationForm: React.FC<ConfigurationFormProps> = ({
  title,
  setTitle,
  dataSource,
  setDataSource,
  machineSource,
  setMachineSource,
  setDataSourceRobotId,
  locationMachines,
  dataCollectingComponents,
  stages,
  toggleQueryBuilder,
}) => {
  // Memoize machine options to prevent unnecessary recalculations
  const machineOptions = useMemo(
    () =>
      locationMachines.map((machine) => ({
        value: machine.id,
        label: machine.name,
      })),
    [locationMachines]
  );

  const handleMachineChange = useCallback(
    (val: string) => {
      const machine = locationMachines.find((robot) => robot.name === val);
      setMachineSource(machine);
      setDataSourceRobotId(machine?.id || "");
    },
    [locationMachines, setMachineSource, setDataSourceRobotId]
  );

  const dataSourceOptions = useMemo(
    () =>
      dataCollectingComponents?.map((component: any, idx: number) => ({
        value: component.name,
        label: component.name,
      })) || [],
    [dataCollectingComponents]
  );

  return (
    <div className="py-4 flex flex-col space-y-6 min-w-[410px] overflow-auto">
      {/* Machine Selection */}
      <div className="space-y-2">
        <Label htmlFor="machineSource">Machine</Label>
        <Select
          value={machineSource?.name || ""}
          onValueChange={handleMachineChange}
          required
        >
          <SelectTrigger id="machineSource">
            <SelectValue
              placeholder="Select a machine"
              defaultValue={machineSource?.name || ""}
            />
          </SelectTrigger>
          <SelectContent>
            {machineOptions.map((robot) => (
              <SelectItem key={robot.value} value={robot.label}>
                {robot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Source Selection */}
      <div className="space-y-2">
        <Label htmlFor="dataSource">Data Source</Label>
        <Select
          value={dataSource}
          onValueChange={(val) => setDataSource(val)}
          required
          disabled={!dataCollectingComponents}
        >
          <SelectTrigger id="dataSource">
            <SelectValue placeholder="Select a data source" />
          </SelectTrigger>
          <SelectContent>
            {dataSourceOptions.map((dataCollectingComponent: any, idx: any) => (
              <SelectItem
                key={`${dataCollectingComponent.value}-${idx}`}
                value={dataCollectingComponent.value}
              >
                {dataCollectingComponent.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

// StageBlock Component
interface StageBlockProps {
  stage: AggregationStage;
  onClick: () => void;
}

const StageBlock: React.FC<StageBlockProps> = ({ stage, onClick }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className="flex items-center justify-center px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 cursor-pointer transition-colors duration-200"
            variant={"secondary"}
          >
            {stage.operator}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="px-0 py-0">
          <JsonCodeEditor
            value={JSON.stringify(stage.definition, null, 2)}
            onChange={() => {}}
            minHeight="min-h-[256px]"
            maxHeight="max-h-[256px]"
            readOnly={true} // only readOnly if locked
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// GroupOfMachinesSelectionForm Component
interface GroupOfMachinesSelectionFormProps {
  locationMachines: Robot[];
  selectedGroupMachinesIds: string[];
  onMachinesSelected: (selectedMachines: string[]) => void;
  onFragmentSelected: (selectedFragment: string | null) => void;
  fragments: {
    value: string;
    label: string;
    machines: string[];
  }[];
}

const GroupOfMachinesSelectionForm: React.FC<
  GroupOfMachinesSelectionFormProps
> = ({
  locationMachines,
  selectedGroupMachinesIds,
  onMachinesSelected,
  onFragmentSelected,
  fragments,
}) => {
  const [selectionType, setSelectionType] = useState<"specific" | "fragment">(
    "specific"
  );
  const [selectedMachines, setSelectedMachines] = useState<string[]>(
    selectedGroupMachinesIds
  );
  const [selectedFragment, setSelectedFragment] = useState<string | null>(null);
  const [openFragments, setOpenFragments] = useState(false);

  // Memoize machine options
  const machines = useMemo(
    () =>
      locationMachines.map((machine) => ({
        value: machine.id,
        label: machine.name,
      })),
    [locationMachines]
  );

  // Effect to handle selection changes
  useEffect(() => {
    if (selectionType === "specific") {
      onMachinesSelected(selectedMachines);
      onFragmentSelected(null);
    } else if (selectionType === "fragment" && selectedFragment) {
      const fragment = fragments.find((f) => f.value === selectedFragment);
      if (fragment) {
        onMachinesSelected(fragment.machines);
      }
    } else {
      onMachinesSelected([]);
    }
  }, [
    selectionType,
    selectedMachines,
    selectedFragment,
    fragments,
    onMachinesSelected,
    onFragmentSelected,
  ]);

  // Memoize handler to prevent re-renders
  const handleSelectionTypeChange = useCallback(
    (value: "specific" | "fragment") => {
      setSelectionType(value);
      setSelectedMachines([]);
      setSelectedFragment(null);
    },
    []
  );

  // Handler when a fragment is selected
  const handleFragmentSelect = useCallback(
    (fragmentValue: string) => {
      setSelectedFragment(fragmentValue);
      setOpenFragments(false);
      onFragmentSelected(fragmentValue);
    },
    [onFragmentSelected]
  );

  return (
    <div className="w-full max-w-md space-y-6 py-4">
      <RadioGroup
        value={selectionType}
        onValueChange={handleSelectionTypeChange}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="specific" id="specific" />
          <Label htmlFor="specific">Choose specific machines</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="fragment" id="fragment" disabled />
          <Label htmlFor="fragment" className="text-gray-400">
            Choose machines by configuration fragment{" "}
            <Badge variant="secondary" className="mr-2">
              Coming Soon
            </Badge>
          </Label>
        </div>
      </RadioGroup>

      {selectionType === "specific" && (
        <SearchableMultiSelect
          options={machines}
          placeholder="Select machines..."
          onChange={(selected) => {
            setSelectedMachines(selected);
            onMachinesSelected(selected);
          }}
          selectedOptionIds={selectedGroupMachinesIds}
        />
      )}

      {selectionType === "fragment" && (
        <Popover open={openFragments} onOpenChange={setOpenFragments}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openFragments}
              className="w-full justify-between"
            >
              {selectedFragment
                ? fragments.find((f) => f.value === selectedFragment)?.label
                : "Select fragment..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search fragments..." />
              <CommandEmpty>No fragment found.</CommandEmpty>
              <CommandGroup>
                {fragments.map((fragment) => (
                  <CommandItem
                    key={fragment.value}
                    onSelect={() => handleFragmentSelect(fragment.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedFragment === fragment.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {fragment.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* 
      Uncomment the following block if you want to display selected machines or fragments
      
      <div className="space-y-2">
        <Label>
          Selected{" "}
          {selectionType === "specific" ? "Machines" : "Fragment Machines"}:
        </Label>
        <div className="flex flex-wrap gap-2">
          {selectionType === "specific"
            ? selectedMachines.map((machineValue) => (
                <Badge key={machineValue} variant="secondary">
                  {machines.find((m) => m.value === machineValue)?.label}
                </Badge>
              ))
            : selectedFragment &&
              fragments
                .find((f) => f.value === selectedFragment)
                ?.machines.map((machine) => (
                  <Badge key={machine} variant="secondary">
                    {machine}
                  </Badge>
                ))}
        </div>
      </div> 
      */}
    </div>
  );
};
