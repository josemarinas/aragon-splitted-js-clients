import { Context, ContextCore, ContextState } from "@aragon/sdk-client-common";
import { MultisigContextParams } from "./types";

// TODO
// import from @aragon/sdk-client-common
type OverridenState = {
  daoFactoryAddress: boolean;
  ensRegistryAddress: boolean;
  gasFeeEstimationFactor: boolean;
  ipfsNodes: boolean;
  graphqlNodes: boolean;
};

type MultisigContextState = ContextState & {
  // extend the Context state with a new state for storing
  // the new parameters
  myParam: string;
};

type MultisigOverridenState = OverridenState & {
  myParam: boolean;
};

export class MultisigContext extends ContextCore {
  // super is called before the properties are initialized
  // so we initialize them to the value of the parent class
  protected state: MultisigContextState = this.state;
  protected overriden: MultisigOverridenState = this.overriden;
  constructor(
    contextParams?: Partial<MultisigContextParams>,
    context?: Context,
  ) {
    // parent contructor will call this.set(contextParams)
    // so we don't need to call it again
    super(contextParams);
    if (context) {
      // copy the context properties to this
      Object.assign(this, context);
      // overide the context params with the ones passed to the constructor
      this.set(contextParams ?? {});
    }
  }

  public set(contextParams: MultisigContextParams) {
    // the super function will call this set
    // so we need to call the parent set first
    super.set(contextParams);
    // set the default values for the new params
    this.setDefaults();
    // override default params if specified in the context
    if (contextParams.myParam) {
      // override the myParam value
      this.state.myParam = contextParams.myParam;
      // set the overriden flag to true in case set is called again
      this.overriden.myParam = true;
    }
  }

  private setDefaults() {
    if (!this.overriden.myParam) {
      // set the default value for myParam
      this.state.myParam = "default";
    }
  }

  get myParam(): string {
    return this.state.myParam;
  }
}
