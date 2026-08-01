import { AutoTextSize } from 'auto-text-size';

interface ResizeTextProps {
  text: string;
}

const ResizeText = ({ text }: ResizeTextProps) => {
  return (
    <div className="resize-text">
      <div className="resize-text__inner">
        <AutoTextSize mode="boxoneline">
          {text.split('\n').map((line, index, arr) => (
            <div key={index} style={{ fontWeight: 700 }}>
              {line}
              {index < arr.length - 1 && <br />}
            </div>
          ))}
        </AutoTextSize>
      </div>
    </div>
  );
};

export default ResizeText;
