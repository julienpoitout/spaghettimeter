import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, CreditCard, Receipt, ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import { getStripeEnvironment } from "@/lib/stripe";

const Billing = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?next=/billing");
  }, [user, authLoading, navigate]);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/billing`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed to open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({
        title: "Could not open billing portal",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <motion.div
            className="text-5xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          >
            🍝
          </motion.div>
          <p className="font-display text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Billing & Subscription — SpaghettiMeter"
        description="Manage your SpaghettiMeter subscription, download receipts and update payment methods."
        canonical="https://spaghettimeter.com/billing"
      />
      <div className="container max-w-4xl mx-auto px-4 py-10 space-y-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Billing & subscription</h1>
          <p className="text-muted-foreground font-body mt-2">
            {isPro
              ? "You're on the Pro plan. Manage your plan, payment method, and invoices."
              : "You're on the Free plan. Upgrade to Pro for unlimited analyses, saves, and history."}
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Manage your subscription
              </h2>
              <p className="text-sm text-muted-foreground font-body">
                {isPro
                  ? "Use the billing portal to make changes."
                  : "Upgrade to unlock the full SpaghettiMeter experience."}
              </p>
            </div>
            {isPro ? (
              <Button variant="spaghettify" onClick={openBillingPortal} disabled={portalLoading} className="gap-2">
                Open billing portal
                <ExternalLink className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="spaghettify" onClick={() => navigate("/pricing")} className="gap-2">
                <Crown className="w-4 h-4" /> Upgrade to Pro
              </Button>
            )}
          </div>

          {isPro && (
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <ArrowUpDown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Upgrade or downgrade</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Switch plans or cancel anytime.</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <Receipt className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Download receipts</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Access invoices and payment history.</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-4 flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-display font-semibold text-sm">Update payment</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">Change card or billing details.</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Billing;
