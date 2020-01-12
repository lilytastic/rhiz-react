import { ActorBaseData, ActorState, ActorWithState } from "../models/actor.model";
import { Motion } from "../models/motion.model";
import { PolicyBaseData, PolicyState } from "../models/policy.model";
import * as Policies from "../content/policies.json";
import { SettlementState, SettlementBaseData, PoliticalOffice } from "../models/settlement.model";

declare global {
  interface Array<T> {
    shuffle(): T[];
    toEntities(): {[id: string]: T};
  }
}

if (!Array.prototype.shuffle) {
  Array.prototype.shuffle = function<T>() {
    const woo = [...this];
    var currentIndex = this.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = woo[currentIndex];
      woo[currentIndex] = woo[randomIndex];
      woo[randomIndex] = temporaryValue;
    }

    return woo;
  }
}

if (!Array.prototype.toEntities) {
  Array.prototype.toEntities = function<T>(preserveId: boolean = true) {
    const obj: {[id: string]: T} = {};
    for (let i = 0; i < this.length; i++) {
      const entity = {...this[i]}
      if (preserveId) {
        delete entity.id;
      }
      obj[this[i].id] = entity;
    }
    return obj;
  }
}

interface PoliticalStructure {
  name: string;
  offices: {[id: string]: PoliticalOffice}
}

export interface Vote {actorId: string, motionId: string, purchaseAgreement?: {purchasedBy: string, amountSpent: number}, vote: string; reason: string}


const OFFICE_CHIEF: PoliticalOffice = {
  name: {basic: 'Chief', feminine: 'Chieftess'},
  voteWeight: 5,
  softCapitalPerCycle: 1000,
  softCapitalCap: 5000
}
const OFFICE_ROYAL_ADMINISTRATOR: PoliticalOffice = {
  name: {basic: 'Royal Administrator'},
  voteWeight: 3,
  softCapitalPerCycle: 500,
  softCapitalCap: 3000
}
const OFFICE_ELDER: PoliticalOffice = {
  name: {basic: 'Elder'},
  voteWeight: 3,
  softCapitalPerCycle: 500,
  softCapitalCap: 2000
}

const OFFICE_CHIEFTAIN: PoliticalOffice = {
  name: {basic: 'Chieftain'},
  voteWeight: 3,
  softCapitalPerCycle: 500,
  softCapitalCap: 2500
}
const OFFICE_ADMINISTRATOR: PoliticalOffice = {
  name: {basic: 'Administrator'},
  voteWeight: 2,
  softCapitalPerCycle: 200,
  softCapitalCap: 1000
}
const OFFICE_DEFENSE_SECRETARY: PoliticalOffice = {
  name: {basic: 'Secretary of Defense'},
  voteWeight: 2,
  softCapitalPerCycle: 200,
  softCapitalCap: 1000
}

const OFFICE_EDUCATION_SECRETARY: PoliticalOffice = {
  name: {basic: 'Secretary of Education'},
  voteWeight: 2,
  softCapitalPerCycle: 150,
  softCapitalCap: 800
}
const OFFICE_TREASURER: PoliticalOffice = {
  name: {basic: 'Treasurer'},
  voteWeight: 2,
  softCapitalPerCycle: 150,
  softCapitalCap: 800
}

const POLITICAL_STRUCTURE_TRIBAL: PoliticalStructure = {
  name: 'Tribal',
  offices: {
    'chieftain': OFFICE_CHIEFTAIN,
    'elder': OFFICE_ELDER,
    'admin': {...OFFICE_ADMINISTRATOR, name: {basic: 'Advisor'}},
    'defense_sec': {...OFFICE_DEFENSE_SECRETARY, name: {basic: 'Warlord'}},
    'education_sec': {...OFFICE_EDUCATION_SECRETARY, name: {basic: 'Guru'}}
  }
}

export interface State {
  screen: string;
  actors: ActorBaseData[];
  policies: PolicyBaseData[];
  settlements: SettlementBaseData[];
  phases: {id: string, label: string, countdown: number}[];
  saveData: SaveData;
}

export interface SaveData {
  settlementState: {[id: string]: SettlementState};
  actorState: {[id: string]: ActorState};
  availableMotions: Motion[];
  motionsTabled: {id: string; tabledBy: string}[];
  motionVotes: {[id: string]: {[id: string]: {vote: string, reason: string}}};
  currentPhase: number;
  currentPhaseCountdown: number;
}

const initialState: State = {
  screen: 'title',
  actors: [],
  // @ts-ignore;
  policies: Policies.default,
  settlements: [{id: 'test'}],
  phases: [{ id: 'table', label: 'Draft', countdown: 20 }, { id: 'vote', label: 'Vote', countdown: 40 }],
  saveData: {
    actorState: {},
    availableMotions: [],
    motionsTabled: [],
    motionVotes: {}, // type can be 'motivated', 'bought', 'respect'
    settlementState: {
      'test': {
        policies: {},
        offices: POLITICAL_STRUCTURE_TRIBAL.offices,
        officeOccupants: {
          chieftain: 'shireen',
          elder: 'abigail',
          admin: 'vex',
          defense_sec: 'gretchen',
          education_sec: 'matilda'
        }
      }
    },
    currentPhase: 0,
    currentPhaseCountdown: 0
  }
};

export function rootReducer(state = initialState, action: any): State {
  if (action.type !== 'CHANGE_CURRENT_PHASE_COUNTDOWN') {
    console.log(action);
  }
  switch (action.type) {
    case 'LOAD_ACTORS':
      const newState = action.actors.map((x: ActorWithState) => ({...state.saveData.actorState, ...x.state, id: x.id})).toEntities(false);
      return {
        ...state,
        actors: action.actors.map((x: ActorWithState) => {const mutated = {...x}; delete mutated.state; return mutated;}),
        saveData: {
          ...state.saveData,
          actorState: {...state.saveData.actorState, ...newState}
        }
      };
    case 'UPDATE_ACTORS':
      const _newState = action.changes.map((x: any) => ({...state.saveData.actorState[x.id], ...x.changes})).toEntities(false);
      return {
        ...state,
        saveData: {
          ...state.saveData,
          actorState: {...state.saveData.actorState, ..._newState}
        }
      };
    case 'PASS_MOTION':
      switch (action.motion.change.type) {
        case 'CHANGE_POLICY':
          const settlementState = Object.keys(state.saveData.settlementState)
            .map((key) => {
              const currentState = state.saveData.settlementState[key];
              const newPolicies = {...currentState.policies};
              newPolicies[action.motion.change.payload.policyId] = action.motion.change.payload.stanceId;
              return {...state.saveData.settlementState[key], id: key, policies: newPolicies};
            });
          console.log(settlementState, settlementState.toEntities());
          return {
            ...state,
            saveData: {
              ...state.saveData,
              settlementState: settlementState.toEntities()
            }
          };
        case 'REPEAL_POLICY':
          const _settlementState = Object.keys(state.saveData.settlementState)
            .map((key) => {
              const currentState = state.saveData.settlementState[key];
              const newPolicies = {...currentState.policies};
              delete newPolicies[action.motion.change.payload.policyId];
              return {...state.saveData.settlementState[key], id: key, policies: newPolicies};
            });
          console.log(_settlementState, _settlementState.toEntities());
          return {
            ...state,
            saveData: {
              ...state.saveData,
              settlementState: _settlementState.toEntities()
            }
          };
        default:
          return state;
      }
    case 'CHANGE_VOTE':
      const change = action.change;
      const _motionVotes = {...state.saveData.motionVotes};
      _motionVotes[change.motionId] = _motionVotes[change.motionId] || {};
      _motionVotes[change.motionId][change.actorId] = {vote: change.vote, reason: change.reason};
      return {
        ...state,
        saveData: {
          ...state.saveData,
          motionVotes: _motionVotes
        }
      };
    case 'CHANGE_VOTES':
      const changes: {actorId: string, motionId: string, vote: string, reason: string}[] = action.changes;
      const motionVotes = {...state.saveData.motionVotes};
      changes.forEach(change => {
        motionVotes[change.motionId] = motionVotes[change.motionId] || {};
        motionVotes[change.motionId][change.actorId] = {vote: change.vote, reason: change.reason};
      });
      return {
        ...state,
        saveData: {
          ...state.saveData,
          motionVotes: motionVotes
        }
      };
    case 'TABLE_MOTION':
      return {
        ...state,
        saveData: {
          ...state.saveData,
          motionsTabled: [...state.saveData.motionsTabled, { id: action.motion, tabledBy: action.tabledBy }]
        }
      };
    case 'RESCIND_MOTION':
      let index = state.saveData.motionsTabled.findIndex(x => x.id === action.motion);
      return {
        ...state,
        saveData: {...state.saveData, motionsTabled: [...state.saveData.motionsTabled.slice(0, index), ...state.saveData.motionsTabled.slice(index + 1)] }
      };
    case 'CHANGE_SCREEN':
      return { ...state, screen: action.screen };
    case 'CHANGE_CURRENT_PHASE':
      return { ...state, saveData: {...state.saveData, currentPhase: action.currentPhase, currentPhaseCountdown: 0 }};
    case 'CHANGE_CURRENT_PHASE_COUNTDOWN':
      return { ...state, saveData: {...state.saveData, currentPhaseCountdown: action.currentPhaseCountdown }};
    case 'REFRESH_AVAILABLE_MOTIONS':
      let motions: Motion[] = [];
      const settlementState: SettlementState = state.saveData.settlementState['test'];

      const possibleMotions: Motion[] = [];
      state.policies.forEach(policy => {
        const existingStance = settlementState?.policies[policy.id];
        if (policy.canBeRepealed && existingStance) {
          const effects = policy.stances[existingStance].effects.map(x => ({stat: x.stat, amount: -x.amount}));
          possibleMotions.push({
            id: `repeal_${policy.id}`,
            name: `Repeal Stance on ${policy.label}`,
            change: {
              type: 'REPEAL_POLICY',
              payload: {policyId: policy.id}
            },
            costToTable: effects.reduce((acc, curr) => {
              let amount = curr.amount;
              return acc + Math.abs(amount);
            }, 0) * 20,
            effects: effects
          });
        }
        Object.keys(policy.stances).forEach(key => {
          const stance = policy.stances[key];
          const effects = stance.effects.map(x => {
            const relevantEffect = existingStance ? policy.stances[existingStance].effects.find(eff => eff.stat === x.stat) : null;
            return {
              ...x,
              amount: existingStance ? x.amount - (relevantEffect ? relevantEffect.amount : 0) : x.amount
            };
          });
          possibleMotions.push({
            id: `${policy.id}_${key}`,
            name: `Declare ${policy.label} ${stance.label}`,
            change: {
              type: 'CHANGE_POLICY',
              payload: {policyId: policy.id, stanceId: key}
            },
            costToTable: effects.reduce((acc, curr) => {
              let amount = curr.amount;
              return acc + Math.abs(amount);
            }, 0) * 20,
            effects: effects
          });
        });
      });

      motions = possibleMotions.filter(x => x.effects.reduce((acc, curr) => acc + Math.abs(curr.amount), 0) > 0).shuffle().slice(0, 6);

      return {
        ...state,
        saveData: {
          ...state.saveData,
          motionsTabled: [],
          motionVotes: {},
          availableMotions: motions
        }
      };
    default:
      return state;
  }
}
