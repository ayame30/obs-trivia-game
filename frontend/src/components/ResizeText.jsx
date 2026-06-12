import { AutoTextSize } from 'auto-text-size'

const ResizeText = ({ text }) => {
    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AutoTextSize mode="boxoneline">
              {text.split('\n').map((line, index, arr) => (
                  <div key={index} style={{ fontWeight: 700 }}>
                  {line}
                  {index < arr.length - 1 && <br />}
                </div>
              ))}
            </AutoTextSize>
          </div>
    );
}

export default ResizeText;