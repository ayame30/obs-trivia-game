import VoteBars from './VoteBars';
import CountdownDisplay from './CountdownDisplay';
import { AutoTextSize } from 'auto-text-size'
import ResizeText from './ResizeText';

export default function LiveRoundPanel({ round, showCorrect = false, showCountdown = true, countdownVariant = 'default' }) {
  if (!round) {
    return <p style={{ color: 'var(--muted)' }}>No active round. Start a question from the question bank.</p>;
  }

  const q = round.question;
  const ended = round.status === 'ended';

  return (
    <div>
      <div style={{
        width: '800px',
        position: 'relative',
        fontSize: 0,
      }}>
        <img src="/IMG_21401.png" alt="Round #{round.id}" style={{ width: '100%', height: 'auto' }} />
        {showCorrect && q.correctAnswer === 'A' &&
        <img src="/A.png" alt="Round #{round.id}" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        }{showCorrect && q.correctAnswer === 'B' &&
        <img src="/B.png" alt="Round #{round.id}" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        }{showCorrect && q.correctAnswer === 'C' &&
        <img src="/C.png" alt="Round #{round.id}" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        }{showCorrect && q.correctAnswer === 'D' &&
        <img src="/D.png" alt="Round #{round.id}" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        }

        <div style={{ position: 'absolute', top: '12.5%', color: '#000', fontWeight: 500, textAlign: 'center', left: '10%', width: '80%', height: '25%'}}>
          <ResizeText text={q.text}/>
        </div>
        <div style={{ color: '#000', fontWeight: 500, textAlign: 'center', position: 'absolute', top: '54%', left: '18%', width: '28%', height: '15%' }}>  
          <ResizeText text={q.optionA} />
          {round?.voteCounts?.A && <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bottom: '-30%', right: '-10%', fontSize: '1rem', lineHeight: '1em',  background: '#DF683F', minWidth: '30px', height: '30px', borderRadius: '100%'}}>
            <span>{round?.voteCounts?.A}</span>
          </div>}
        </div>
        <div style={{ position: 'absolute',color: '#000', fontWeight: 500, textAlign: 'center', top: '52%', left: '63%', width: '28%', height: '15%' }}>  
          <ResizeText text={q.optionB} />
          {round?.voteCounts?.B && <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bottom: '-30%', right: '-10%', fontSize: '1rem', lineHeight: '1em',  background: '#DF683F', minWidth: '30px', height: '30px', borderRadius: '100%'}}>
            <span>{round?.voteCounts?.B}</span>
          </div>}
        </div>
        <div style={{ position: 'absolute',color: '#000', fontWeight: 500, textAlign: 'center', top: '78.5%', left: '18%', width: '28%', height: '15%'}}>  
          <ResizeText text={q.optionC} />
          {round?.voteCounts?.C && <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bottom: '-30%', right: '-10%', fontSize: '1rem', lineHeight: '1em',  background: '#DF683F', minWidth: '30px', height: '30px', borderRadius: '100%'}}>
            <span>{round?.voteCounts?.C}</span>
          </div>}
        </div>
        <div style={{ position: 'absolute',color: '#000', fontWeight: 500, textAlign: 'center', top: '77%', left: '63%', width: '28%', height: '15%' }}>  
          <ResizeText text={q.optionD}/>
          {round?.voteCounts?.D && <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', bottom: '-30%', right: '-10%', fontSize: '1rem', lineHeight: '1em',  background: '#DF683F', minWidth: '30px', height: '30px', borderRadius: '100%'}}>
            <span>{round?.voteCounts?.D}</span>
          </div>}
        </div>

        {(
          <div style={{ zIndex: 2, position: 'absolute', fontWeight: 500, textAlign: 'center', top: '4.5%', right: '4.5%', width: '10%', height: '15%' }}>  
            <CountdownDisplay round={round} variant={countdownVariant} />
          </div>
        )}
      </div>
    </div>
  );
}
