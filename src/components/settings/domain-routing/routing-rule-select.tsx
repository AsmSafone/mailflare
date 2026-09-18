import * as React from "react";
import { Select } from "@/components/ui/select";
import type { SelectProps } from "@/components/ui/select-types";

export const RoutingRuleSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
	(props, ref) => <Select ref={ref} {...props} />
);
RoutingRuleSelect.displayName = "RoutingRuleSelect";

