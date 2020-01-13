import React from 'react';
import { StatIcon } from '../components/StatIcon';
import { returnActorWithState, returnActorWithStateAndOffices } from '../models/actor.model';
import { getAssociatedVoteColor, getCostToInfluence, getActorApproval } from '../helpers/politics.helpers';
import { getById } from '../helpers/entity.helpers';
import { State } from '../store/reducers';
import { changeVote } from '../store/actionCreators';
import { connect, ConnectedProps } from 'react-redux';

class SettlementCircle extends React.Component {
  // @ts-ignore;
  props: Props;

  makeOffer = (actorId: string, motionId: string, vote: string, amountSpent: number) => {
    this.props.dispatch(changeVote({
      actorId: actorId,
      motionId: motionId,
      vote: vote,
      reason: 'bought',
      purchaseAgreement: {purchasedBy: 'player', amountSpent: amountSpent}
    }));
  }

  render = () => (
    this.props.actors
      .filter(x => x.id === this.props.player?.id || x.voteWeight > 0)
      .sort((a, b) => a.id === this.props.player.id ? -1 : 1)
      .map((x, i) => (
        <div className={`${(i === 0 && x.id === this.props.player?.id) ? 'mb-4' : 'mb-2'} btn-group-vertical bg-white w-100 rounded actor__wrapper`} key={x.id}>
          <button className="btn btn-outline-dark w-100 text-left">
            <div className="row">
              <div className="col">
                <b>{x.id === this.props.player.id ? 'You' : x.name}</b>
                {x.offices.length > 0 && (', ' + ((x.gender === 'm' ? x.offices[0].name.masculine : x.offices[0].name.feminine) || x.offices[0].name.basic))}
              </div>
              <div className="col row mr-0 justify-content-end">
                <div className="col-6"><StatIcon stat='capital' value={x.state.capital}></StatIcon></div>
                <div className="col-4"><StatIcon stat='votes' value={x.voteWeight}></StatIcon></div>
              </div>
            </div>
            {
            <div className="d-flex">
              {x.state.positions.map(position => (
                <div key={position.stat} style={{ opacity: position.passion / 100.0 }}>
                  <StatIcon stat={position.stat} color={position.attitude !== 'raise' ? 'crimson' : 'initial'}></StatIcon>
                </div>
              ))}
            </div>
            }
            {this.props.phase?.id !== 'table' && !!this.props.availableMotions.find(x => x.id === this.props.inspectedMotion) ? (
              <div>
                <div>
                  {!!this.props.motionVotes[this.props.inspectedMotion]?.[x.id] ? (
                    <span>
                      Voted <b style={{ color: getAssociatedVoteColor(this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.vote || 'abstain') }}>{this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.vote || 'abstain'}</b>
                    </span>
                  ) : x.voteWeight > 0 ? 'Vote pending' : `Cannot vote`}
                  {!!this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.purchaseAgreement && (
                    <span>
                      &nbsp;as a favour to {getById(this.props.actors, this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.purchaseAgreement.purchasedBy)?.name}&nbsp;&nbsp; <StatIcon stat='capital' value={this.props.motionVotes[this.props.inspectedMotion][x.id]?.purchaseAgreement.amountSpent}></StatIcon>
                    </span>
                  )}
                </div>
              </div>
            ) : (
                <div></div>
              )}
          </button>
          {(this.props.phase?.id !== 'table' && x.id !== this.props.player.id && !!this.props.availableMotions.find(y => y.id === this.props.inspectedMotion)) ? (() => {
            // @ts-ignore;
            const approval = getActorApproval(x, this.props.availableMotions.find(y => y.id === this.props.inspectedMotion));
            const costToInfluence = getCostToInfluence(x, approval);
            const currentOffer = this.props.currentVoteOffers[x.id]?.find(x => x.motionId === this.props.inspectedMotion)?.purchaseAgreement;
            return (
              <div className="btn-group w-100">
                {[{ key: 'yea', color: 'success' }, { key: 'abstain', color: 'secondary' }, { key: 'nay', color: 'danger' }].map(key => (
                  <button key={key.key}
                      className={`d-flex align-items-center px-0 justify-content-center btn btn-${(this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.vote === key.key) ? '' : 'outline-'}${key.color} w-100`}
                      disabled={this.props.motionVotes[this.props.inspectedMotion]?.[x.id]?.vote === key.key || this.props.player.state.capital < Math.max(!!currentOffer ? (currentOffer?.amountSpent + 100) : 0, costToInfluence[key.key]) || this.props.motionsTabled.find(y => y.id === this.props.inspectedMotion)?.tabledBy === x.id}
                      onClick={() => this.makeOffer(x.id, this.props.inspectedMotion, key.key, Math.max(!!currentOffer ? (currentOffer?.amountSpent + 100) : 0, costToInfluence[key.key]))}>
                    {key.key}&nbsp;&nbsp;<span className="small"><StatIcon stat='capital' value={Math.max(!!currentOffer ? (currentOffer?.amountSpent + 100) : 0, costToInfluence[key.key])}></StatIcon></span>
                  </button>
                ))}
              </div>
            );
          })() : null}
        </div>
      ))
  )
}

const mapStateToProps = (state: State) => {
  const settlement = state.settlements.map(x => ({...x, state: state.saveData.settlementState[x.id]}))[0];

  const actors = state.actors
    .map(x => ({...returnActorWithStateAndOffices(x, state.saveData.actorState[x.id], settlement)}))
    .sort((a, b) => Math.max(...a.offices.map(x => x.softCapitalCap)) > Math.max(...b.offices.map(x => x.softCapitalCap)) ? -1 : 1);

  return {
    actors: actors,
    settlement: settlement,
    phase: state.phases[state.saveData.currentPhase || 0],
    player: actors.find((x: any) => x.id === 'player') || actors[0],
    motionsTabled: state.saveData.motionsTabled,
    motionVotes: state.saveData.motionVotes,
    currentVoteOffers: state.saveData.currentVoteOffers,
    inspectedMotion: state.saveData.inspectedMotion,
    availableMotions: state.saveData.availableMotions
  }
};

const connector = connect(
  mapStateToProps
);

type PropsFromRedux = ConnectedProps<typeof connector>
type Props = PropsFromRedux;

export default connector(SettlementCircle);
