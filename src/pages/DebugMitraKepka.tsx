import { useAuth } from "@/contexts/AuthContext";
import { useSatkerConfigContext } from "@/contexts/SatkerConfigContext";
import { useOrganikBPS, useMitraStatistik } from "@/hooks/use-database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugMitraKepka() {
  const { user } = useAuth();
  const satkerContext = useSatkerConfigContext();
  const { data: organikBPSData, loading: organikLoading } = useOrganikBPS();
  const { data: mitraStatistikData, loading: mitraLoading } = useMitraStatistik();

  const spreadsheetId = satkerContext?.getUserSatkerSheetId('masterorganik');
  const spreadsheetIdTagging = satkerContext?.getUserSatkerSheetId('tagging');

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Info - MitraKepka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">Auth Info</h3>
            <pre className="text-xs bg-white p-2 border rounded overflow-auto">
{JSON.stringify({
  user_satker: user?.satker,
  user_id: user?.id,
  user_name: user?.name,
}, null, 2)}
            </pre>
          </div>

          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">SatkerContext</h3>
            <pre className="text-xs bg-white p-2 border rounded overflow-auto">
{JSON.stringify({
  isLoading: satkerContext?.isLoading,
  configs_count: satkerContext?.configs?.length,
  configs: satkerContext?.configs?.map(c => ({
    satker_id: c.satker_id,
    masterorganik_sheet_id: c.masterorganik_sheet_id?.substring(0, 30) + '...',
    tagging_sheet_id: c.tagging_sheet_id?.substring(0, 30) + '...'
  })),
}, null, 2)}
            </pre>
          </div>

          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">Spreadsheet IDs</h3>
            <pre className="text-xs bg-white p-2 border rounded overflow-auto">
{JSON.stringify({
  masterorganik_sheet_id: spreadsheetId?.substring(0, 30) + '...',
  tagging_sheet_id: spreadsheetIdTagging?.substring(0, 30) + '...',
}, null, 2)}
            </pre>
          </div>

          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">MASTER.ORGANIK Data</h3>
            <div className="text-xs">
              <p>Loading: {organikLoading ? 'true' : 'false'}</p>
              <p>Data count: {organikBPSData.length}</p>
              <p>First item:</p>
              <pre className="bg-white p-2 border rounded overflow-auto">
{organikBPSData[0] ? JSON.stringify(organikBPSData[0], null, 2) : 'No data'}
              </pre>
              <p>Last item:</p>
              <pre className="bg-white p-2 border rounded overflow-auto">
{organikBPSData[organikBPSData.length - 1] ? JSON.stringify(organikBPSData[organikBPSData.length - 1], null, 2) : 'No data'}
              </pre>
            </div>
          </div>

          <div className="border p-4 rounded bg-slate-50">
            <h3 className="font-bold mb-2">MASTER.MITRA Data</h3>
            <div className="text-xs">
              <p>Loading: {mitraLoading ? 'true' : 'false'}</p>
              <p>Data count: {mitraStatistikData.length}</p>
              <p>First item:</p>
              <pre className="bg-white p-2 border rounded overflow-auto">
{mitraStatistikData[0] ? JSON.stringify(mitraStatistikData[0], null, 2) : 'No data'}
              </pre>
              <p>Last item:</p>
              <pre className="bg-white p-2 border rounded overflow-auto">
{mitraStatistikData[mitraStatistikData.length - 1] ? JSON.stringify(mitraStatistikData[mitraStatistikData.length - 1], null, 2) : 'No data'}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
