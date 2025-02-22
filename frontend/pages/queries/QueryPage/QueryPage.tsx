import React, { useState, useEffect, useContext } from "react";
import { useQuery, useMutation } from "react-query";
import { Params } from "react-router/lib/Router";

// @ts-ignore
import Fleet from "fleet"; // @ts-ignore
import { QueryContext } from "context/query";
import { QUERIES_PAGE_STEPS, DEFAULT_QUERY } from "utilities/constants";
import queryAPI from "services/entities/queries"; // @ts-ignore
import hostAPI from "services/entities/hosts"; // @ts-ignore
import { IQueryFormData, IQuery } from "interfaces/query";
import { ITarget } from "interfaces/target";
import { IHost } from "interfaces/host";
import { AppContext } from "context/app";

import QuerySidePanel from "components/side_panels/QuerySidePanel";
import QueryEditor from "pages/queries/QueryPage/screens/QueryEditor";
import SelectTargets from "pages/queries/QueryPage/screens/SelectTargets";
import RunQuery from "pages/queries/QueryPage/screens/RunQuery";
import ExternalURLIcon from "../../../../assets/images/icon-external-url-12x12@2x.png";

interface IQueryPageProps {
  router: any;
  params: Params;
  location: any; // TODO: find Location type
}

interface IStoredQueryResponse {
  query: IQuery;
}

interface IHostResponse {
  host: IHost;
}

const baseClass = "query-page";

const QueryPage = ({
  router,
  params: { id: paramsQueryId },
  location: { query: URLQuerySearch },
}: IQueryPageProps) => {
  const queryIdForEdit = paramsQueryId ? parseInt(paramsQueryId, 10) : null;
  const { isGlobalAdmin, isGlobalMaintainer } = useContext(AppContext);
  const { selectedOsqueryTable, setSelectedOsqueryTable } = useContext(
    QueryContext
  );

  const [step, setStep] = useState<string>(QUERIES_PAGE_STEPS[1]);
  const [selectedTargets, setSelectedTargets] = useState<ITarget[]>([]);
  const [isLiveQueryRunnable, setIsLiveQueryRunnable] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [
    isEditorUsingDefaultQuery,
    setIsEditorUsingDefaultQuery,
  ] = useState<boolean>(true);
  const [typedQueryBody, setTypedQueryBody] = useState<string>("");

  const [
    showOpenSchemaActionText,
    setShowOpenSchemaActionText,
  ] = useState<boolean>(false);

  const {
    isLoading: isStoredQueryLoading,
    data: storedQuery = DEFAULT_QUERY,
    error: storedQueryError,
  } = useQuery<IStoredQueryResponse, Error, IQuery>(
    ["query", queryIdForEdit],
    () => queryAPI.load(queryIdForEdit as number),
    {
      enabled: !!queryIdForEdit,
      select: (data: IStoredQueryResponse) => data.query,
    }
  );

  // if URL is like `/queries/1?host_ids=22`, add the host
  // to the selected targets automatically
  useQuery<IHostResponse, Error, IHost>(
    "hostFromURL",
    () => hostAPI.load(parseInt(URLQuerySearch.host_ids as string, 10)),
    {
      enabled: !!URLQuerySearch.host_ids,
      select: (data: IHostResponse) => data.host,
      onSuccess: (data) => {
        const targets = selectedTargets;
        const hostTarget = data as any; // intentional so we can add to the object

        hostTarget.target_type = "hosts";

        targets.push(hostTarget as IHost);
        setSelectedTargets([...targets]);
      },
    }
  );

  const { mutateAsync: createQuery } = useMutation((formData: IQueryFormData) =>
    queryAPI.create(formData)
  );

  useEffect(() => {
    const detectIsFleetQueryRunnable = () => {
      Fleet.status.live_query().catch(() => {
        setIsLiveQueryRunnable(false);
      });
    };

    detectIsFleetQueryRunnable();
  }, []);

  useEffect(() => {
    setShowOpenSchemaActionText(!isSidebarOpen);
  }, [isSidebarOpen]);

  const onOsqueryTableSelect = (tableName: string) => {
    setSelectedOsqueryTable(tableName);
  };

  const onCloseSchemaSidebar = () => {
    setIsSidebarOpen(false);
  };

  const onOpenSchemaSidebar = () => {
    setIsSidebarOpen(true);
  };

  const renderLiveQueryWarning = (): JSX.Element | null => {
    if (isLiveQueryRunnable) {
      return null;
    }

    return (
      <div className={`${baseClass}__warning`}>
        <div className={`${baseClass}__message`}>
          <p>
            Fleet is unable to run a live query. Refresh the page or log in
            again. If this keeps happening please{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/fleetdm/fleet/issues/new/choose"
            >
              file an issue <img alt="" src={ExternalURLIcon} />
            </a>
          </p>
        </div>
      </div>
    );
  };

  const renderScreen = () => {
    const step1Opts = {
      router,
      baseClass,
      storedQuery,
      typedQueryBody,
      queryIdForEdit,
      showOpenSchemaActionText,
      isStoredQueryLoading,
      error: storedQueryError,
      isEditorUsingDefaultQuery,
      setIsEditorUsingDefaultQuery,
      createQuery,
      onOsqueryTableSelect,
      goToSelectTargets: () => setStep(QUERIES_PAGE_STEPS[2]),
      setTypedQueryBody,
      onOpenSchemaSidebar,
      renderLiveQueryWarning,
    };

    const step2Opts = {
      baseClass,
      selectedTargets: [...selectedTargets],
      queryIdForEdit,
      goToQueryEditor: () => setStep(QUERIES_PAGE_STEPS[1]),
      goToRunQuery: () => setStep(QUERIES_PAGE_STEPS[3]),
      setSelectedTargets,
    };

    const step3Opts = {
      typedQueryBody,
      storedQuery,
      selectedTargets,
      queryIdForEdit,
      setSelectedTargets,
      goToQueryEditor: () => setStep(QUERIES_PAGE_STEPS[1]),
    };

    switch (step) {
      case QUERIES_PAGE_STEPS[2]:
        return <SelectTargets {...step2Opts} />;
      case QUERIES_PAGE_STEPS[3]:
        return <RunQuery {...step3Opts} />;
      default:
        return <QueryEditor {...step1Opts} />;
    }
  };

  const isFirstStep = step === QUERIES_PAGE_STEPS[1];
  const sidebarClass = isFirstStep && isSidebarOpen && "has-sidebar";
  const showSidebar =
    isFirstStep && isSidebarOpen && (isGlobalAdmin || isGlobalMaintainer);

  return (
    <div className={`${baseClass} ${sidebarClass}`}>
      <div className={`${baseClass}__content`}>{renderScreen()}</div>
      {showSidebar && (
        <QuerySidePanel
          onOsqueryTableSelect={onOsqueryTableSelect}
          selectedOsqueryTable={selectedOsqueryTable}
          onClose={onCloseSchemaSidebar}
        />
      )}
    </div>
  );
};

export default QueryPage;
