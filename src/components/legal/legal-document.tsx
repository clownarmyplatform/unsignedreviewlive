import { PageIntro } from "@/components/ui/page-intro";
import { SectionCard } from "@/components/ui/section-card";

type LegalSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  subsections?: ReadonlyArray<{
    heading: string;
    paragraphs?: readonly string[];
    bullets?: readonly string[];
  }>;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly LegalSection[];
};

export function LegalDocument({
  eyebrow,
  title,
  intro,
  sections,
}: LegalDocumentProps) {
  return (
    <div className="space-y-6">
      <PageIntro eyebrow={eyebrow} title={title} description={intro} />

      <SectionCard title={title}>
        <article className="space-y-8 text-sm leading-7 text-zinc-300 sm:text-base">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h3 className="font-display text-xl uppercase tracking-[0.04em] text-white sm:text-2xl sm:tracking-[0.06em]">
                {section.heading}
              </h3>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {section.bullets?.length ? (
                <ul className="list-disc space-y-2 pl-5 text-zinc-200 marker:text-fuchsia-400/80">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}

              {section.subsections?.map((subsection) => (
                <div
                  key={subsection.heading}
                  className="space-y-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
                >
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100 sm:text-base">
                    {subsection.heading}
                  </h4>

                  {subsection.paragraphs?.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}

                  {subsection.bullets?.length ? (
                    <ul className="list-disc space-y-2 pl-5 text-zinc-200 marker:text-fuchsia-400/80">
                      {subsection.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </section>
          ))}
        </article>
      </SectionCard>
    </div>
  );
}
