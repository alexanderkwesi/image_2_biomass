// components/routes/PublicRoutes.jsx
import { Route, Routes } from "react-router-dom";
import PublicLayout from "../Layouts/PublicLayout";
import AboutScreen from "../screens/AboutScreen";
import BlogPostScreen from "../screens/BlogPostScreen";
import BlogScreen from "../screens/BlogScreen";
import ContactScreen from "../screens/ContactScreen";
import FAQScreen from "../screens/FAQScreen";
import FeaturesScreen from "../screens/FeaturesScreen";
import LandingScreen from "../screens/LandingScreen";
import NotFoundScreen from "../screens/NotFoundScreen";
import PricingScreen from "../screens/PricingScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import TermsOfServiceScreen from "../screens/TermsOfServiceScreen";

const PublicRoutes = () => {
  return (
    <PublicLayout>
      <Routes>
        {/* Landing/Home */}
        <Route path="/" element={<LandingScreen />} />
        
        {/* Marketing Pages */}
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/features" element={<FeaturesScreen />} />
        <Route path="/pricing" element={<PricingScreen />} />
        
        {/* Contact & Support */}
        <Route path="/contact" element={<ContactScreen />} />
        <Route path="/faq" element={<FAQScreen />} />
        
        {/* Legal */}
        <Route path="/privacy" element={<PrivacyPolicyScreen />} />
        <Route path="/terms" element={<TermsOfServiceScreen />} />
        
        {/* Blog */}
        <Route path="/blog" element={<BlogScreen />} />
        <Route path="/blog/:slug" element={<BlogPostScreen />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </PublicLayout>
  );
};

export default PublicRoutes;