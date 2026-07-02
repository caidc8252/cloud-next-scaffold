import {
  Card,
  CardContent,
  CardHeader,
  PageBody,
  Skeleton,
  Spinner,
} from "@cloud/ui";

const LOADING_ROWS = [0, 1, 2, 3] as const;

export default function Loading() {
  return (
    <PageBody>
      <div aria-busy="true" className="grid gap-4">
        <div className="flex min-h-10 items-start justify-between gap-4">
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-7 w-48 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Spinner aria-label="Loading dashboard page" size="lg" />
        </div>

        <Card size="sm">
          <CardHeader>
            <Skeleton className="h-5 w-40 max-w-full" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {LOADING_ROWS.map((row) => (
                <Skeleton key={row} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}
