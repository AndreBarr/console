import { gql } from '@apollo/client';

export const ALL_RESOURCES = gql`
  query AllResourcesQuery {
    allDevices {
      id,
      name
    }
    allLabels {
      id,
      name,
      color,
    }
    allFunctions {
      id,
      name,
      format
    }
    allChannels {
      id,
      name,
      type_name,
      type
    }
  }
`
