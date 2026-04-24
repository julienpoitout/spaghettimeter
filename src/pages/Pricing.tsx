import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { StripeEmbeddedCheckoutForm } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCheckout, setShowCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpgrade = () => {
    if (!user) {
      navigate("/auth?next=/pricing");
      return;
    }
    setShowCheckout(true);
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/dashboard`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Failed to open billing portal");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Could not open billing portal", description: e.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pricing — SpaghettiMeter Pro"
        description="Unlock unlimited GitHub repository analyses, save your scans to a personal dashboard, and track code quality over time. Just $2.99/month."
        canonical="https://spaghettimeter.com/pricing"
      />
      <PaymentTestModeBanner />
      <div className="container max-w-5xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 mb-12"
        >
          <div className="text-5xl">🍝</div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">
            Pick your <span className="text-primary">plan</span>
          </h1>
          <p className="text-muted-foreground font-body max-w-xl mx-auto">
            Start free. Upgrade when you want unlimited scans and a history of your repo's code quality.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-8 flex flex-col"
          >
            <h3 className="text-2xl font-display font-bold">Free</h3>
            <p className="text-muted-foreground font-body text-sm mt-1">For casual scans</p>
            <p className="text-4xl font-display font-bold mt-4">$0<span className="text-base font-body text-muted-foreground">/forever</span></p>
            <ul className="space-y-3 mt-6 mb-8 text-sm font-body">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> 3 repo analyses per week</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> 1 saved analysis</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Public repos</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Private repos with your GitHub token</li>
            </ul>
            <Button variant="outline" disabled className="mt-auto">Current plan</Button>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col relative shadow-elegant"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-display font-bold px-3 py-1 rounded-full">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-display font-bold">Pro</h3>
            <p className="text-muted-foreground font-body text-sm mt-1">For serious developers</p>
            <p className="text-4xl font-display font-bold mt-4">$2.99<span className="text-base font-body text-muted-foreground">/month</span></p>
            <ul className="space-y-3 mt-6 mb-8 text-sm font-body">
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> <strong>Unlimited</strong> repo analyses</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> <strong>Unlimited</strong> saved analyses</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Score-over-time charts</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Side-by-side comparisons</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> One-click re-analyze</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> Cancel anytime</li>
            </ul>
            {isPro ? (
              <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="mt-auto">
                {portalLoading ? "Opening…" : "Manage subscription"}
              </Button>
            ) : (
              <Button variant="spaghettify" onClick={handleUpgrade} className="mt-auto">
                {user ? "Upgrade to Pro" : "Sign up & upgrade"}
              </Button>
            )}
          </motion.div>
        </div>

        {showCheckout && !isPro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6"
          >
            <h3 className="font-display font-bold text-xl mb-4">Complete your subscription</h3>
            <StripeEmbeddedCheckoutForm priceId="pro_monthly" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Pricing;