import { Section } from "./Section";
import { Placeholder } from "./Placeholder";

export function SectionHeader({isFooter=false}: {isFooter?: boolean}){
    return(
        <Section>
            <div className="flex flex-col items-center justify-center gap-4">
                <Placeholder type={isFooter ? "logo" : "title"} />
                <Placeholder type="subtitle" />
            </div>
        </Section>
    )
}
