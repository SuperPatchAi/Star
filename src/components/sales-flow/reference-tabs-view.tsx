"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  MessageSquare,
  ShieldQuestion,
  CheckCircle,
  Zap,
  Target,
  Calendar,
  Quote,
  User,
  Lightbulb,
  FlaskConical,
} from "lucide-react";
import { ShareCopyButton } from "@/components/ui/share-copy-button";
import type { Product } from "@/types";
import type { WordTrack } from "@/types/wordtrack";

interface ReferenceTabsViewProps {
  product: Product;
  wordTrack: WordTrack | null;
}

const sections = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "opening", label: "Opening", icon: MessageSquare },
  { id: "discovery", label: "Discovery", icon: Target },
  { id: "presentation", label: "Presentation", icon: Lightbulb },
  { id: "objections", label: "Objections", icon: ShieldQuestion },
  { id: "closing", label: "Closing", icon: CheckCircle },
  { id: "followup", label: "Follow-Up", icon: Calendar },
  { id: "quickref", label: "Quick Ref", icon: Zap },
];

export function ReferenceTabsView({ product, wordTrack }: ReferenceTabsViewProps) {
  const hasWordTrackData = wordTrack !== null;

  const getOverviewText = () => {
    if (!wordTrack) return "";
    return wordTrack.overview || wordTrack.productOverview || "";
  };
  const overviewText = getOverviewText();

  const getOpeningScripts = () => wordTrack?.openingScripts || [];
  const getDiscoveryQuestions = () => wordTrack?.discoveryQuestions || [];
  const getProductPresentation = () => {
    if (!wordTrack) return "";
    if (typeof wordTrack.productPresentation === "string") {
      return wordTrack.productPresentation;
    }
    if (wordTrack.productPresentation) {
      return (
        wordTrack.productPresentation.fullScript ||
        `<p><strong>Problem:</strong> ${wordTrack.productPresentation.problem || ""}</p>
              <p><strong>Agitate:</strong> ${wordTrack.productPresentation.agitate || ""}</p>
              <p><strong>Solve:</strong> ${wordTrack.productPresentation.solve || ""}</p>`
      );
    }
    return "";
  };
  const getObjections = () =>
    wordTrack?.objections || wordTrack?.objectionHandling || [];
  const getClosingScripts = () => wordTrack?.closingScripts || [];
  const getFollowUpSequence = () =>
    wordTrack?.followUpSequence || wordTrack?.followUpSequences || [];
  const getQuickReference = () => wordTrack?.quickReference;

  return (
    <Tabs defaultValue="overview" className="flex-1">
      <ScrollArea className="w-full whitespace-nowrap">
        <TabsList className="h-9 w-full justify-start rounded-none border-b bg-transparent p-0">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-3 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none text-xs md:text-sm md:px-4"
              >
                <Icon className="size-3 md:size-4 mr-1 md:mr-1.5" />
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{section.label.slice(0, 4)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </ScrollArea>

      {/* Overview Tab */}
      <TabsContent value="overview" className="mt-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold mb-3">Product Overview</h3>
            <div className="text-sm space-y-3">
              {hasWordTrackData && overviewText ? (
                <div className="prose prose-sm max-w-none">
                  {overviewText.split("\n\n").map((paragraph: string, i: number) => (
                    <p
                      key={i}
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: paragraph }}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <p>
                    <strong>{product.name}</strong> uses Vibrotactile Technology
                    (VTT) to provide drug-free support for {product.category}
                    -related concerns.
                  </p>
                  <div>
                    <p className="font-medium mb-1.5">How VTT Works</p>
                    <p className="text-muted-foreground">
                      The patch contains a specific pattern that, when in contact
                      with the skin, creates a subtle vibrotactile signal that
                      interacts with the body&apos;s nervous system.
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="font-medium mb-1.5">Key Differentiators</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• 100% drug-free and non-invasive</li>
                  <li>• No side effects or contraindications</li>
                  <li>• Can be used alongside other treatments</li>
                  <li>• Immediate application</li>
                  {product.hasClinicalStudy && (
                    <li>
                      • Backed by clinical research ({product.studyName})
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {hasWordTrackData && wordTrack.customerProfile ? (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <User className="size-4" />
                Ideal Customer Profile
              </h3>
              <div className="text-sm space-y-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Pain Points
                  </p>
                  <ul className="space-y-1">
                    {wordTrack.customerProfile.painPoints
                      .slice(0, 5)
                      .map((point: string, i: number) => (
                        <li key={i} className="text-muted-foreground text-xs">
                          &ldquo;{point}&rdquo;
                        </li>
                      ))}
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    What They&apos;ve Tried
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {wordTrack.customerProfile.previousSolutions
                      .slice(0, 6)
                      .map((solution: string, i: number) => (
                        <span key={i} className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                          {solution.length > 25
                            ? solution.slice(0, 25) + "..."
                            : solution}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Zap className="size-4" />
                Quick Reference
              </h3>
              <div className="text-sm space-y-4">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Key Benefits
                  </p>
                  <ul className="space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="size-3 text-green-600" />
                      Drug-free {product.category} support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="size-3 text-green-600" />
                      No contraindications
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="size-3 text-green-600" />
                      Works within hours
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="size-3 text-green-600" />
                      Lasts up to 24 hours
                    </li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Ideal Customer
                  </p>
                  <p className="text-muted-foreground">
                    People seeking natural alternatives for {product.category}{" "}
                    support, those who want to avoid medications, and
                    health-conscious individuals.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Opening Scripts Tab */}
      <TabsContent value="opening" className="mt-4 space-y-0">
        {hasWordTrackData && getOpeningScripts().length > 0 ? (
          getOpeningScripts().map((script, idx) => (
            <div key={script.id || idx} className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">{script.title}</h4>
                <ShareCopyButton text={script.script || script.content || ""} className="size-8" />
              </div>
              {script.scenario && (
                <p className="text-xs text-muted-foreground mb-2">{script.scenario}</p>
              )}
              <div className="bg-muted rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                {script.script || script.content}
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">Cold Call Script</h4>
                <ShareCopyButton text={`"Hi [Name], this is [Your Name] from Super Patch.\n\nI'm reaching out because we've developed an innovative drug-free solution for ${product.category} that's getting remarkable results.\n\nDo you have 2 minutes to hear how it works?"`} className="size-8" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Initial outreach call</p>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                {`"Hi [Name], this is [Your Name] from Super Patch. 

I'm reaching out because we've developed an innovative drug-free solution for ${product.category} that's getting remarkable results.

Do you have 2 minutes to hear how it works?"`}
              </div>
            </div>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">Referral Opening</h4>
                <ShareCopyButton text={`"Hi [Name], [Referrer] mentioned you might be interested in a drug-free ${product.category} solution.\n\nThey thought our ${product.name} patch could be a great fit. Would you like to hear more?"`} className="size-8" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Following up on a referral</p>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                {`"Hi [Name], [Referrer] mentioned you might be interested in a drug-free ${product.category} solution.

They thought our ${product.name} patch could be a great fit. Would you like to hear more?"`}
              </div>
            </div>
          </>
        )}
      </TabsContent>

      {/* Discovery Questions Tab */}
      <TabsContent value="discovery" className="mt-4">
        <div>
          <h3 className="text-base font-semibold mb-1">Discovery Questions</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Questions to uncover customer needs and pain points
          </p>
          {hasWordTrackData && getDiscoveryQuestions().length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {["opening", "pain_point", "pain", "impact", "solution"].map(
                (category) => {
                  const questions = getDiscoveryQuestions().filter(
                    (q) => q.category === category
                  );
                  if (questions.length === 0) return null;
                  const categoryLabel = category
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());
                  return (
                    <AccordionItem key={category} value={category}>
                      <AccordionTrigger className="text-sm">
                        {categoryLabel} Questions ({questions.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-3">
                          {questions.map((q, i) => (
                            <li
                              key={q.id || i}
                              className="flex items-start gap-3 group"
                            >
                              <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                                {i + 1}
                              </span>
                              <p className="text-sm text-muted-foreground pt-0.5 flex-1">
                                &ldquo;{q.question}&rdquo;
                              </p>
                              <ShareCopyButton text={q.question} className="size-6" iconClassName="size-3" />
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }
              )}
            </Accordion>
          ) : (
            <ul className="space-y-3">
              <li className="flex items-start gap-3 group">
                <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">1</span>
                <p className="text-sm text-muted-foreground pt-0.5 flex-1">&ldquo;What have you tried so far for {product.category}?&rdquo;</p>
                <ShareCopyButton text={`What have you tried so far for ${product.category}?`} className="size-6" iconClassName="size-3" />
              </li>
              <li className="flex items-start gap-3 group">
                <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">2</span>
                <p className="text-sm text-muted-foreground pt-0.5 flex-1">&ldquo;How does {product.category} impact your daily life?&rdquo;</p>
                <ShareCopyButton text={`How does ${product.category} impact your daily life?`} className="size-6" iconClassName="size-3" />
              </li>
              <li className="flex items-start gap-3 group">
                <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">3</span>
                <p className="text-sm text-muted-foreground pt-0.5 flex-1">&ldquo;On a scale of 1-10, how much does this affect your quality of life?&rdquo;</p>
                <ShareCopyButton text="On a scale of 1-10, how much does this affect your quality of life?" className="size-6" iconClassName="size-3" />
              </li>
            </ul>
          )}
        </div>
      </TabsContent>

      {/* Presentation Tab */}
      <TabsContent value="presentation" className="mt-4">
        <div>
          <h3 className="text-base font-semibold mb-1">Product Presentation (P-A-S Framework)</h3>
          <p className="text-xs text-muted-foreground mb-3">Problem-Agitate-Solve script for your presentation</p>
          <div className="space-y-0">
            {hasWordTrackData && getProductPresentation() ? (
              typeof wordTrack?.productPresentation === "string" ? (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: wordTrack.productPresentation }}
                />
              ) : wordTrack?.productPresentation ? (
                <>
                  <div className="flat-list-row group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Problem</span>
                      <ShareCopyButton text={wordTrack.productPresentation.problem || ""} className="size-6" iconClassName="size-3" />
                    </div>
                    <p className="text-sm text-muted-foreground">{wordTrack.productPresentation.problem}</p>
                  </div>
                  <div className="flat-list-row group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Agitate</span>
                      <ShareCopyButton text={wordTrack.productPresentation.agitate || ""} className="size-6" iconClassName="size-3" />
                    </div>
                    <p className="text-sm text-muted-foreground">{wordTrack.productPresentation.agitate}</p>
                  </div>
                  <div className="flat-list-row group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Solve</span>
                      <ShareCopyButton text={wordTrack.productPresentation.solve || ""} className="size-6" iconClassName="size-3" />
                    </div>
                    <p className="text-sm text-muted-foreground">{wordTrack.productPresentation.solve}</p>
                  </div>
                  {wordTrack.productPresentation.fullScript && (
                    <div className="flat-list-row">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Full 2-Minute Script</span>
                        <ShareCopyButton text={wordTrack.productPresentation.fullScript} className="size-8" />
                      </div>
                      <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                        {wordTrack.productPresentation.fullScript}
                      </div>
                    </div>
                  )}
                </>
              ) : null
            ) : (
              <>
                <div className="flat-list-row group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Problem</span>
                    <ShareCopyButton text={`Many people experience ${product.category} issues that significantly impact their quality of life.`} className="size-6" iconClassName="size-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Many people experience {product.category} issues that significantly impact their quality of life.
                  </p>
                </div>
                <div className="flat-list-row group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Agitate</span>
                    <ShareCopyButton text="This can lead to frustration, reduced productivity, and a reliance on temporary solutions." className="size-6" iconClassName="size-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This can lead to frustration, reduced productivity, and a reliance on temporary solutions.
                  </p>
                </div>
                <div className="flat-list-row group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Solve</span>
                    <ShareCopyButton text={`The ${product.name} patch offers a revolutionary, drug-free way to address ${product.category} issues through Vibrotactile Technology.`} className="size-6" iconClassName="size-3" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The {product.name} patch offers a revolutionary, drug-free way to address {product.category} issues through Vibrotactile Technology.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Objections Tab */}
      <TabsContent value="objections" className="mt-4 space-y-0">
        {hasWordTrackData && getObjections().length > 0 ? (
          getObjections().map((obj, idx) => (
            <div key={obj.id || idx} className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold">&ldquo;{obj.objection}&rdquo;</h4>
                <ShareCopyButton text={obj.response} className="size-8" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                <p className="text-sm text-muted-foreground">{obj.response}</p>
              </div>
              {obj.psychology && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Psychology</p>
                    <p className="text-xs text-muted-foreground">{obj.psychology}</p>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold">&ldquo;It&apos;s too expensive&rdquo;</h4>
                <ShareCopyButton text={`I understand cost is a consideration. What are you currently spending on ${product.category} solutions? When you factor in effectiveness and being completely drug-free, most people find it's quite economical.`} className="size-8" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                <p className="text-sm text-muted-foreground">
                  &ldquo;I understand cost is a consideration. What are you currently spending on {product.category} solutions? When you factor in effectiveness and being completely drug-free, most people find it&apos;s quite economical.&rdquo;
                </p>
              </div>
            </div>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold">&ldquo;Does it really work?&rdquo;</h4>
                <ShareCopyButton text={`I appreciate your skepticism. Yes, it works, and we have ${product.hasClinicalStudy ? `clinical studies to back it up. The ${product.studyName} showed significant results.` : "thousands of satisfied customers."} Want to try it risk-free?`} className="size-8" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                <p className="text-sm text-muted-foreground">
                  &ldquo;I appreciate your skepticism. Yes, it works, and we have{" "}
                  {product.hasClinicalStudy
                    ? `clinical studies to back it up. The ${product.studyName} showed significant results.`
                    : "thousands of satisfied customers."}{" "}
                  Want to try it risk-free?&rdquo;
                </p>
              </div>
            </div>
          </>
        )}
      </TabsContent>

      {/* Closing Tab */}
      <TabsContent value="closing" className="mt-4 space-y-0">
        {hasWordTrackData && getClosingScripts().length > 0 ? (
          getClosingScripts().map((script, idx) => (
            <div key={script.id || idx} className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">{script.title}</h4>
                <ShareCopyButton text={script.script || script.content || ""} className="size-8" />
              </div>
              {script.type && (
                <p className="text-xs text-muted-foreground mb-2 capitalize">{script.type}</p>
              )}
              <div className="bg-muted rounded-lg p-3 font-mono text-sm whitespace-pre-wrap">
                {script.script || script.content}
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">Assumptive Close</h4>
                <ShareCopyButton text={`Great! Should I set you up with a single pack to start, or does the 3-pack make more sense since it includes free shipping?`} className="size-8" />
              </div>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                {`"Great! Should I set you up with a single pack to start, or does the 3-pack make more sense since it includes free shipping?"`}
              </div>
            </div>
            <div className="flat-list-row">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">Trial Close</h4>
                <ShareCopyButton text={`We have a satisfaction guarantee, so you can try it risk-free. If you don't see results, we'll make it right. Ready to give it a shot?`} className="size-8" />
              </div>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm">
                {`"We have a satisfaction guarantee, so you can try it risk-free. If you don't see results, we'll make it right. Ready to give it a shot?"`}
              </div>
            </div>
          </>
        )}
      </TabsContent>

      {/* Follow-Up Tab */}
      <TabsContent value="followup" className="mt-4">
        <div>
          <h3 className="text-base font-semibold mb-1">Follow-Up Sequence</h3>
          <p className="text-xs text-muted-foreground mb-3">Multi-day follow-up templates</p>
          {hasWordTrackData && getFollowUpSequence().length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {getFollowUpSequence().map((item, index) => (
                <AccordionItem key={index} value={item.day}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{item.day}</span>
                      {item.title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {item.voicemail && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Voicemail</p>
                          <ShareCopyButton text={item.voicemail} className="size-6" iconClassName="size-3" />
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{item.voicemail}</div>
                      </div>
                    )}
                    {item.email && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                          <ShareCopyButton text={item.email} className="size-6" iconClassName="size-3" />
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{item.email}</div>
                      </div>
                    )}
                    {item.text && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Text</p>
                          <ShareCopyButton text={item.text} className="size-6" iconClassName="size-3" />
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">{item.text}</div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="space-y-0">
              <div className="flat-list-row">
                <span className="text-xs font-semibold text-primary">Day 1</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Send a thank-you email with key benefits and a link to relevant resources.
                </p>
              </div>
              <div className="flat-list-row">
                <span className="text-xs font-semibold text-primary">Day 3-4</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Check in to see if they have any initial questions or need assistance.
                </p>
              </div>
              <div className="flat-list-row">
                <span className="text-xs font-semibold text-primary">Day 7</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Share a success story or a tip for maximizing results.
                </p>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Quick Reference Tab */}
      <TabsContent value="quickref" className="mt-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              Key Benefits
            </h3>
            <ul className="space-y-2">
              {hasWordTrackData && getQuickReference()?.keyBenefits ? (
                getQuickReference()!.keyBenefits.map((benefit: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />
                    {benefit}
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2 text-sm"><CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />Drug-free {product.category} support</li>
                  <li className="flex items-start gap-2 text-sm"><CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />No contraindications or side effects</li>
                  <li className="flex items-start gap-2 text-sm"><CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />Works with your body&apos;s natural systems</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Target className="size-4 text-blue-600" />
              Best Discovery Questions
            </h3>
            <ol className="space-y-2">
              {hasWordTrackData && getQuickReference()?.bestQuestions ? (
                getQuickReference()!.bestQuestions.map((question: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground group">
                    <span className="shrink-0 font-medium text-foreground">{i + 1}.</span>
                    <span className="flex-1">{question}</span>
                    <ShareCopyButton text={question} className="size-6" iconClassName="size-3" />
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground group"><span className="shrink-0 font-medium text-foreground">1.</span><span className="flex-1">What have you tried so far?</span><ShareCopyButton text="What have you tried so far?" className="size-6" iconClassName="size-3" /></li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground group"><span className="shrink-0 font-medium text-foreground">2.</span><span className="flex-1">How does this impact your daily life?</span><ShareCopyButton text="How does this impact your daily life?" className="size-6" iconClassName="size-3" /></li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground group"><span className="shrink-0 font-medium text-foreground">3.</span><span className="flex-1">What matters most in a solution?</span><ShareCopyButton text="What matters most in a solution?" className="size-6" iconClassName="size-3" /></li>
                </>
              )}
            </ol>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <ShieldQuestion className="size-4 text-orange-600" />
              Top Objection Responses
            </h3>
            <ul className="space-y-3">
              {hasWordTrackData && getQuickReference()?.topObjections ? (
                getQuickReference()!.topObjections.map((obj, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm group">
                    <div className="flex-1">
                      <p className="font-medium">&ldquo;{obj.objection}&rdquo;</p>
                      <p className="text-muted-foreground text-xs mt-1">&rarr; {obj.response || obj.shortResponse}</p>
                    </div>
                    <ShareCopyButton text={obj.response || obj.shortResponse || ""} className="size-6" iconClassName="size-3" />
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2 text-sm group"><div className="flex-1"><p className="font-medium">&ldquo;Too expensive&rdquo;</p><p className="text-muted-foreground text-xs mt-1">&rarr; What other factors matter to you beyond price?</p></div><ShareCopyButton text="What other factors matter to you beyond price?" className="size-6" iconClassName="size-3" /></li>
                  <li className="flex items-start gap-2 text-sm group"><div className="flex-1"><p className="font-medium">&ldquo;Does it work?&rdquo;</p><p className="text-muted-foreground text-xs mt-1">&rarr; What would help you feel confident in trying it?</p></div><ShareCopyButton text="What would help you feel confident in trying it?" className="size-6" iconClassName="size-3" /></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Quote className="size-4 text-purple-600" />
              Best Closing Lines
            </h3>
            <ul className="space-y-3">
              {hasWordTrackData && getQuickReference()?.bestClosingLines ? (
                getQuickReference()!.bestClosingLines.map((line: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg group">
                    <span className="flex-1">&ldquo;{line}&rdquo;</span>
                    <ShareCopyButton text={line} className="size-6" iconClassName="size-3" />
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg group"><span className="flex-1">&ldquo;How many should we start you with today?&rdquo;</span><ShareCopyButton text="How many should we start you with today?" className="size-6" iconClassName="size-3" /></li>
                  <li className="flex items-center gap-2 text-sm bg-muted p-2 rounded-lg group"><span className="flex-1">&ldquo;Would you prefer the single pack or the 3-pack for better value?&rdquo;</span><ShareCopyButton text="Would you prefer the single pack or the 3-pack for better value?" className="size-6" iconClassName="size-3" /></li>
                </>
              )}
            </ul>
          </div>

          {hasWordTrackData && getQuickReference()?.keyStats && (
            <div className="lg:col-span-2">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <FlaskConical className="size-4 text-green-600" />
                Key Clinical Stats
              </h3>
              <div className="flex flex-wrap gap-2">
                {getQuickReference()!.keyStats!.map((stat: string, i: number) => (
                  <span key={i} className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                    {stat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
