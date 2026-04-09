import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InvestmentRanking } from '@/types/bulk-analysis';
import { ArrowUpDown } from 'lucide-react';

interface InvestmentRankingsTableProps {
  rankings: InvestmentRanking[];
}

export function InvestmentRankingsTable({ rankings }: InvestmentRankingsTableProps) {
  const [sortedRankings, setSortedRankings] = useState(rankings);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSort = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    setSortedRankings([...sortedRankings].sort((a, b) => 
      newDirection === 'asc' 
        ? a.overallScore - b.overallScore 
        : b.overallScore - a.overallScore
    ));
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    if (score >= 4) return 'outline';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Rankings</CardTitle>
        <CardDescription>
          Top startups ranked by overall score and potential
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Startup Name</TableHead>
                <TableHead className="cursor-pointer" onClick={toggleSort}>
                  <div className="flex items-center gap-1">
                    Score
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Top Strengths</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRankings.map((ranking) => (
                <TableRow key={ranking.startupName}>
                  <TableCell className="font-medium">#{ranking.rank}</TableCell>
                  <TableCell className="font-medium">{ranking.startupName}</TableCell>
                  <TableCell>
                    <Badge variant={getScoreBadge(ranking.overallScore)}>
                      {Math.round(ranking.overallScore)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <ul className="list-disc list-inside space-y-1">
                      {ranking.topStrengths.map((strength, idx) => (
                        <li key={idx} className="text-muted-foreground">{strength}</li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-sm">{ranking.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
