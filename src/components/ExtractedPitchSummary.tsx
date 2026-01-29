import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import type { SlideContent } from "@/lib/document-parser";

interface ExtractedPitchSummaryProps {
  pitchSummary: string;
  slides?: SlideContent[];
}

const ExtractedPitchSummary = ({ pitchSummary, slides }: ExtractedPitchSummaryProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-foreground">Extracted & Cleaned Pitch Summary</h3>
              <p className="text-sm text-muted-foreground">AI-structured content from PDF</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4 space-y-4">
          {/* Executive Summary */}
          <div className="p-4 bg-background/50 rounded-lg border border-border/50">
            <h4 className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Executive Summary
            </h4>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {pitchSummary}
            </p>
          </div>

          {/* Slide-by-slide breakdown */}
          {slides && slides.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Slide-by-Slide Breakdown</h4>
              <div className="grid gap-3">
                {slides.map((slide) => (
                  <div 
                    key={slide.slideNumber} 
                    className="p-3 bg-background/30 rounded-lg border border-border/30"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Slide {slide.slideNumber}
                      </span>
                      {slide.heading && (
                        <span className="text-sm font-medium text-foreground">
                          {slide.heading}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {slide.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ExtractedPitchSummary;
