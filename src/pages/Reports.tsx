import { useEffect, useState } from "react";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      setReports(data || []);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold neon-text mb-2">Reports</h1>
        <p className="text-muted-foreground">Download analysis reports in PDF or CSV format</p>
      </div>

      <div className="grid gap-4">
        {reports.length > 0 ? reports.map((report) => (
          <div key={report.id} className="glass-card p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h3 className="font-semibold">{report.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {new Date(report.created_at).toLocaleDateString()}
                  <span className="px-2 py-0.5 rounded bg-muted text-xs uppercase">{report.format}</span>
                </div>
              </div>
            </div>
            <Button className="btn-ocean gap-2"><Download className="w-4 h-4" /> Download</Button>
          </div>
        )) : (
          <div className="glass-card p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reports generated yet. Complete an analysis to generate reports.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
