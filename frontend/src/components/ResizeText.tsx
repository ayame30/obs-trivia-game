import { AutoTextSize } from 'auto-text-size';

interface ResizeTextProps {
  text: string;
}

const ResizeText = ({ text }: ResizeTextProps) => {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div>
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
