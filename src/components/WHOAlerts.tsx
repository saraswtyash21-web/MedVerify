// WHO Alerts Component
// Displays WHO Medical Product Alert matches for scanned products

import { WHOAlertMatch, getWHOAlertCount, getWHOLastRetrievalDate } from '../data/whoAlerts';
import { AlertTriangle, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';

type Language = 'en' | 'hi';

interface WHOAlertsProps {
  match: WHOAlertMatch;
  language: Language;
}

export function WHOAlerts({ match, language }: WHOAlertsProps) {
  const alertCount = getWHOAlertCount();
  const lastRetrieval = getWHOLastRetrievalDate();

  if (alertCount === 0) {
    return (
      <div className="bg-ivory rounded-xl p-4 border border-sage/20">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'WHO अलर्ट उपलब्ध नहीं' : 'WHO Alerts Not Available'}
            </h3>
            <p className="text-sm text-text-main/70 mb-2">
              {language === 'hi'
                ? 'कोई WHO अलर्ट रिकॉर्ड लोड नहीं किए गए हैं। WHO सत्यापन के लिए WHO अलर्ट डेटा आयात करना आवश्यक है।'
                : 'No WHO alert records are loaded. WHO alert data must be imported to enable WHO verification.'}
            </p>
            <div className="text-xs text-text-main/60 bg-gold/10 border border-gold/20 rounded-lg p-2 mt-2">
              <p className="font-medium mb-1">
                {language === 'hi' ? 'WHO अलर्ट डेटा कैसे जोड़ें:' : 'How to add WHO alert data:'}
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  {language === 'hi'
                    ? 'WHO अलर्ट पृष्ठ पर जाएं:'
                    : 'Visit WHO alerts page:'}
                  <a
                    href="https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-deep hover:underline ml-1 inline-flex items-center gap-1"
                  >
                    WHO Medical Product Alerts <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  {language === 'hi'
                    ? 'अलर्ट डेटा को JSON/CSV में निर्यात करें'
                    : 'Export alert data to JSON/CSV'}
                </li>
                <li>
                  {language === 'hi'
                    ? 'डेटा को src/data/whoAlerts.ts में आयात करें'
                    : 'Import data into src/data/whoAlerts.ts'}
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!match.matched) {
    return (
      <div className="bg-positive-light rounded-xl p-4 border border-positive/20">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-positive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'कोई WHO अलर्ट नहीं मिला' : 'No WHO Alert Found'}
            </h3>
            <p className="text-sm text-text-main/70 mb-2">
              {match.explanation}
            </p>
            <div className="text-xs text-text-main/60 bg-positive/10 border border-positive/20 rounded-lg p-2 mt-2">
              <p className="font-medium mb-1">
                {language === 'hi' ? 'डेटा स्रोत:' : 'Data Source:'}
              </p>
              <p>
                {language === 'hi' ? 'WHO चिकित्सा उत्पाद अलर्ट' : 'WHO Medical Product Alerts'}
                {lastRetrieval && (
                  <span className="ml-2">
                    ({language === 'hi' ? 'अंतिम जांच:' : 'Last checked:'} {new Date(lastRetrieval).toLocaleDateString()})
                  </span>
                )}
              </p>
              <p className="mt-1">
                {language === 'hi' ? 'अलर्ट की संख्या:' : 'Alerts checked:'} {alertCount}
              </p>
              <a
                href="https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-deep hover:underline inline-flex items-center gap-1 mt-1"
              >
                {language === 'hi' ? 'WHO अलर्ट देखें' : 'View WHO Alerts'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-xs text-warning bg-warning-light border border-warning/20 rounded-lg p-2 mt-2">
              <p className="font-medium">
                {language === 'hi' ? '⚠️ महत्वपूर्ण:' : '⚠️ Important:'}
              </p>
              <p>
                {language === 'hi'
                  ? 'कोई अलर्ट नहीं मिलने का मतलब यह नहीं है कि दवा सुरक्षित, प्रमाणिक या अनुमोदित है। WHO अलर्ट डेटाबेस व्यापक या अद्यतन नहीं हो सकता है।'
                  : 'No alert found does NOT mean the medicine is safe, authentic, or approved. The WHO alert database may not be comprehensive or up-to-date.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Alert matched
  const alert = match.alert!;
  
  return (
    <div className="bg-warning-light rounded-xl p-4 border-2 border-warning">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-warning text-lg mb-2">
            {language === 'hi' ? '⚠️ WHO अलर्ट मिला!' : '⚠️ WHO Alert Found!'}
          </h3>
          
          <div className="bg-white rounded-lg p-3 mb-3 border border-warning/30">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider">
                  {language === 'hi' ? 'अलर्ट नंबर' : 'Alert Number'}
                </p>
                <p className="text-sm font-semibold text-charcoal">
                  {alert.alertNumber}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider">
                  {language === 'hi' ? 'उत्पाद' : 'Product'}
                </p>
                <p className="text-sm font-semibold text-charcoal">
                  {alert.productName}
                  {alert.genericName && (
                    <span className="text-text-main/70 font-normal"> ({alert.genericName})</span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider">
                  {language === 'hi' ? 'समस्या का प्रकार' : 'Issue Type'}
                </p>
                <p className="text-sm font-semibold text-warning capitalize">
                  {alert.issueType}
                </p>
              </div>
              
              {alert.batchNumbers && alert.batchNumbers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider">
                    {language === 'hi' ? 'प्रभावित बैच' : 'Affected Batches'}
                  </p>
                  <p className="text-sm font-mono text-charcoal">
                    {alert.batchNumbers.join(', ')}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider">
                  {language === 'hi' ? 'तारीख' : 'Date'}
                </p>
                <p className="text-sm text-charcoal">
                  {new Date(alert.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 mb-3 border border-warning/30">
            <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider mb-1">
              {language === 'hi' ? 'विवरण' : 'Description'}
            </p>
            <p className="text-sm text-text-main/70">
              {alert.description}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 mb-3 border border-warning/30">
            <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider mb-1">
              {language === 'hi' ? 'जोखिम' : 'Risks'}
            </p>
            <p className="text-sm text-text-main/70">
              {alert.risks}
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 mb-3 border border-warning/30">
            <p className="text-xs font-medium text-text-main/60 uppercase tracking-wider mb-1">
              {language === 'hi' ? 'सलाह' : 'Advice'}
            </p>
            <p className="text-sm text-text-main/70">
              {alert.advice}
            </p>
          </div>
          
          <div className="text-xs text-text-main/60 bg-warning/10 border border-warning/20 rounded-lg p-2">
            <p className="font-medium mb-1">
              {language === 'hi' ? 'स्रोत:' : 'Source:'}
            </p>
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-deep hover:underline inline-flex items-center gap-1"
            >
              {language === 'hi' ? 'WHO अलर्ट देखें' : 'View WHO Alert'} <ExternalLink className="w-3 h-3" />
            </a>
            {lastRetrieval && (
              <p className="mt-1">
                {language === 'hi' ? 'अंतिम जांच:' : 'Last checked:'} {new Date(lastRetrieval).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="bg-warning border border-warning rounded-lg p-3 mt-3">
            <p className="text-sm font-semibold text-white">
              {language === 'hi'
                ? '🚨 इस उत्पाद का उपयोग न करें। तुरंत फार्मासिस्ट या स्वास्थ्य देखभाल पेशेवर से परामर्श करें।'
                : '🚨 DO NOT USE this product. Consult a pharmacist or healthcare professional immediately.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
