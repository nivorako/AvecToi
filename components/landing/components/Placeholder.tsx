type PlaceholderType = 
| "title" 
| "subtitle" 
| "cardText"
| "smallText"
| "transition"
| "cardDescription"
| "cardTitle"
| "stepTitle"
| "button" 
| "schema"
| "image"
| "icon"
| "logo";

export function Placeholder({ type }: { type: PlaceholderType }) {
  const base = "bg-gray-300 rounded-md mb-2";
  const styles = {
    title: "h-12 w-full",
    subtitle: "h-6 w-96",
    cardText: "h-4 w-full",
    smallText: "h-4 w-4/5",
    transition: "h-5 w-[450px]",
    cardDescription:"h-5 w-[70%]",
    cardTitle: "h-8 w-full",
    stepTitle: "h-8 w-96",
    button: "h-10 w-40",
    schema: "h-64 w-[50%]",
    image: "h-64 w-full",
    icon: "h-8 w-8",
    logo: "h-32 w-32"
  };

  return <div className={`${base} ${styles[type]}`} />;

}
 