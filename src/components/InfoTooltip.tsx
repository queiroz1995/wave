"use client";

import React from 'react';
import { Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipProps {
    infoText: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ infoText }) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 cursor-help p-0">
                    <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p className="max-w-xs">{infoText}</p>
            </TooltipContent>
        </Tooltip>
    );
};